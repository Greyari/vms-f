import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { driver, type DriveStep, type Driver } from "driver.js"
import "driver.js/dist/driver.css"
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "@/context/I18nContext"
import { permissionFor } from "@/lib/routePermissions"
import { APP_TOURS, type TourConfig, type TourStep } from "@/config/appTours"

let activeDriverInstance: Driver | null = null

function waitForElement(
  selector: string,
  timeoutMs = 1800
): Promise<Element | null> {
  if (typeof document === "undefined") return Promise.resolve(null)
  const existing = document.querySelector(selector)
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      const el = document.querySelector(selector)
      if (el) {
        clearInterval(timer)
        resolve(el)
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(timer)
        resolve(null)
      }
    }, 60)
  })
}

export function getTourStorageKey(
  userId: string | number | undefined,
  tourId: string
): string {
  return `vms_tour_done:${userId ?? "anonymous"}:${tourId}`
}

export function isTourCompleted(
  userId: string | number | undefined,
  tourId: string
): boolean {
  if (typeof window === "undefined") return false
  try {
    const val = localStorage.getItem(getTourStorageKey(userId, tourId))
    return val === "true" || val === "1"
  } catch {
    return false
  }
}

export function markTourCompleted(
  userId: string | number | undefined,
  tourId: string
): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getTourStorageKey(userId, tourId), "true")
  } catch {
    // Ignore storage quota / security errors
  }
}

export function filterTourStepsByPermission(
  steps: TourStep[],
  hasPermission: (perm: string) => boolean
): TourStep[] {
  return steps.filter((step) => {
    if (step.requiredPermission && !hasPermission(step.requiredPermission)) {
      return false
    }
    if (step.path) {
      if (step.path === "/") {
        if (!hasPermission("view_visits")) return false
      } else {
        const requiredPerm = permissionFor(step.path)
        if (requiredPerm !== undefined && !hasPermission(requiredPerm)) {
          return false
        }
      }
    }
    return true
  })
}

export interface UseAppTourOptions {
  autoStartWelcome?: boolean
}

export interface UseAppTourReturn {
  availableTours: TourConfig[]
  startTour: (tourId: string) => TourStep[]
  isTourDone: (tourId: string) => boolean
  completedTours: Record<string, boolean>
}

export function useAppTour(options?: UseAppTourOptions): UseAppTourReturn {
  const { user, hasRole, hasPermission } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const autoStartedRef = useRef<string | null>(null)

  const userId = user?.id
  const [completionVersion, setCompletionVersion] = useState(0)

  const completedTours = useMemo(() => {
    void completionVersion
    const map: Record<string, boolean> = {}
    for (const tour of APP_TOURS) {
      map[tour.id] = isTourCompleted(userId, tour.id)
    }
    return map
  }, [userId, completionVersion])

  const availableTours = useMemo(() => {
    return APP_TOURS.filter((tour) => {
      const allowedSteps = filterTourStepsByPermission(
        tour.steps,
        hasPermission
      )
      if (allowedSteps.length === 0) return false
      const matchesRole = tour.roles.some((r) => hasRole(r))
      return matchesRole || allowedSteps.length > 0
    })
  }, [hasRole, hasPermission])

  const isTourDone = useCallback(
    (tourId: string): boolean => {
      return Boolean(completedTours[tourId] || isTourCompleted(userId, tourId))
    },
    [completedTours, userId]
  )

  const launchTourDriver = useCallback(
    (tourId: string): TourStep[] => {
      const tour = APP_TOURS.find((item) => item.id === tourId)
      if (!tour) return []

      const permittedSteps = filterTourStepsByPermission(
        tour.steps,
        hasPermission
      )
      if (permittedSteps.length === 0) return []

      // Filter to steps whose target element exists in the current DOM (or has a cross-page path).
      // Steps with missing targets on the current page are skipped gracefully without error.
      const executableSteps = permittedSteps.filter((step) => {
        if (typeof document === "undefined") return true
        const el = document.querySelector(step.targetSelector)
        if (el) return true
        if (step.path && step.path !== location.pathname) return true
        if (
          (step.targetSelector.includes("vessel-form-") ||
            step.targetSelector.includes("vessel-crew-dialog-") ||
            step.targetSelector.includes("vessel-detail-modal")) &&
          (document.querySelector('[data-tour="vessel-create-btn"]') ||
            document.querySelector('[data-tour="vessel-open-detail-btn"]'))
        ) {
          return true
        }
        return false
      })

      markTourCompleted(userId, tourId)

      if (executableSteps.length === 0) {
        return []
      }

      if (activeDriverInstance) {
        try {
          activeDriverInstance.destroy()
        } catch {
          // Ignore destroy errors
        }
        activeDriverInstance = null
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const moveToIndex = async (
        targetIdx: number,
        activeDriver: Driver
      ): Promise<void> => {
        if (targetIdx < 0 || targetIdx >= executableSteps.length) {
          activeDriver.destroy()
          return
        }
        const targetStep = executableSteps[targetIdx]
        if (targetStep.path && location.pathname !== targetStep.path) {
          navigate(targetStep.path)
        }

        // 1. Handle vessel registration form modal & crew selection submodal
        if (
          targetStep.targetSelector.includes("vessel-form-") ||
          targetStep.targetSelector.includes("vessel-crew-dialog-")
        ) {
          const formModalOpen = document.querySelector(
            '[data-tour="vessel-form-modal-dialog"]'
          )
          if (!formModalOpen) {
            const opener = document.querySelector<HTMLElement>(
              '[data-tour="vessel-create-btn"]'
            )
            if (opener) {
              opener.click()
            }
          }

          // If vessel selection is empty, select first available vessel so crew dialog can open
          const vesselSelectEl = document.querySelector<HTMLSelectElement>(
            "#vessel-select"
          )
          if (
            vesselSelectEl &&
            !vesselSelectEl.value &&
            vesselSelectEl.options.length > 1
          ) {
            const firstOption = Array.from(vesselSelectEl.options).find((opt) =>
              Boolean(opt.value)
            )
            if (firstOption) {
              const nativeSelectSetter = Object.getOwnPropertyDescriptor(
                window.HTMLSelectElement.prototype,
                "value"
              )?.set
              if (nativeSelectSetter) {
                nativeSelectSetter.call(vesselSelectEl, firstOption.value)
              } else {
                vesselSelectEl.value = firstOption.value
              }
              vesselSelectEl.dispatchEvent(
                new Event("change", { bubbles: true })
              )
            }
          }

          if (targetStep.targetSelector.includes("vessel-crew-dialog-")) {
            const crewDialogAlreadyOpen = document.querySelector(
              '[data-tour="vessel-crew-dialog-content"]'
            )
            if (!crewDialogAlreadyOpen) {
              let manageCrewBtn = document.querySelector<HTMLElement>(
                '[data-tour="vessel-form-manage-crew-btn"]'
              )
              if (!manageCrewBtn) {
                await new Promise((r) => setTimeout(r, 100))
                manageCrewBtn = document.querySelector<HTMLElement>(
                  '[data-tour="vessel-form-manage-crew-btn"]'
                )
              }
              if (manageCrewBtn) {
                manageCrewBtn.click()
              }
            }
          } else {
            const crewDialogIsOpen = document.querySelector(
              '[data-tour="vessel-crew-dialog-content"]'
            )
            if (crewDialogIsOpen) {
              const applyBtn = document.querySelector<HTMLElement>(
                '[data-tour="vessel-crew-dialog-apply-btn"], [data-tour="vessel-crew-dialog-content"] button[aria-label*="close" i], [data-tour="vessel-crew-dialog-content"] button[aria-label*="tutup" i]'
              )
              if (applyBtn) {
                applyBtn.click()
              }
            }
          }
        } else {
          const formModalOpen = document.querySelector(
            '[data-tour="vessel-form-modal-dialog"]'
          )
          if (formModalOpen) {
            const closeBtn = document.querySelector<HTMLElement>(
              '[data-tour="vessel-form-modal-dialog"] button[aria-label*="close" i], [data-tour="vessel-form-modal-dialog"] button[aria-label*="tutup" i], [data-tour="vessel-form-modal-dialog"] button[aria-label="Close"], button[data-slot="dialog-close"]'
            )
            if (closeBtn) {
              closeBtn.click()
            }
          }
        }

        // 2. If target step is inside vessel detail modal and modal is not open, trigger opener!
        if (targetStep.targetSelector.includes("vessel-detail-modal")) {
          const alreadyOpen = document.querySelector(
            '[data-tour="vessel-detail-modal-dialog"]'
          )
          if (!alreadyOpen) {
            const opener = document.querySelector<HTMLElement>(
              '[data-tour="vessel-open-detail-btn"]'
            )
            if (opener) {
              opener.click()
            }
          }
        } else {
          // If leaving modal step to a non-modal step, close the modal if open
          const modalOpen = document.querySelector(
            '[data-tour="vessel-detail-modal-dialog"]'
          )
          if (modalOpen) {
            const closeBtn = document.querySelector<HTMLElement>(
              '[data-tour="vessel-detail-modal-dialog"] button[aria-label*="close" i], [data-tour="vessel-detail-modal-dialog"] button[aria-label*="tutup" i], button[data-slot="dialog-close"], button[aria-label="Close"]'
            )
            if (closeBtn) {
              closeBtn.click()
            }
          }
        }

        await waitForElement(targetStep.targetSelector, 1800)
        activeDriver.moveTo(targetIdx)
      }

      const driveSteps: DriveStep[] = executableSteps.map((step) => ({
        element: step.targetSelector,
        popover: {
          title: t(step.titleKey),
          description: t(step.descriptionKey),
          side: step.side ?? "bottom",
          align: "start",
        },
        onHighlightStarted: () => {
          if (step.path && window.location.pathname !== step.path) {
            navigate(step.path)
          }
        },
      }))

      const instance = driver({
        showProgress: true,
        progressText: t("app_overview.tour_progress", {
          current: "{{current}}",
          total: "{{total}}",
        }),
        nextBtnText: t("app_overview.tour_next"),
        prevBtnText: t("app_overview.tour_prev"),
        doneBtnText: t("app_overview.tour_done"),
        allowClose: true,
        animate: !prefersReducedMotion,
        popoverClass: "vms-tour-popover",
        steps: driveSteps,
        onNextClick: (_el, _step, { state, driver: activeDriver }) => {
          const currentIdx = state.activeIndex ?? 0
          if (currentIdx >= executableSteps.length - 1) {
            activeDriver.destroy()
            return
          }
          void moveToIndex(currentIdx + 1, activeDriver)
        },
        onPrevClick: (_el, _step, { state, driver: activeDriver }) => {
          const currentIdx = state.activeIndex ?? 0
          if (currentIdx <= 0) return
          void moveToIndex(currentIdx - 1, activeDriver)
        },
        onPopoverRendered: (popover, { state, driver: activeDriver }) => {
          const isLastStep =
            state.activeIndex !== undefined &&
            state.activeIndex >= driveSteps.length - 1

          if (
            !isLastStep &&
            popover.footerButtons &&
            !popover.footerButtons.querySelector('[data-tour-skip="true"]')
          ) {
            const skipBtn = document.createElement("button")
            skipBtn.type = "button"
            skipBtn.setAttribute("data-tour-skip", "true")
            skipBtn.className = "vms-tour-skip-btn"
            skipBtn.textContent = t("app_overview.tour_skip")
            skipBtn.addEventListener("click", () => {
              activeDriver.destroy()
            })
            popover.footerButtons.prepend(skipBtn)
          }

          if (popover.nextButton) {
            popover.nextButton.focus()
          } else if (popover.closeButton) {
            popover.closeButton.focus()
          }
        },
        onDestroyed: () => {
          activeDriverInstance = null
          markTourCompleted(userId, tourId)
          setCompletionVersion((v) => v + 1)
          const detailModal = document.querySelector(
            '[data-tour="vessel-detail-modal-dialog"]'
          )
          if (detailModal) {
            const closeBtn = document.querySelector<HTMLElement>(
              '[data-tour="vessel-detail-modal-dialog"] button[aria-label*="close" i], [data-tour="vessel-detail-modal-dialog"] button[aria-label*="tutup" i], button[data-slot="dialog-close"], button[aria-label="Close"]'
            )
            if (closeBtn) {
              closeBtn.click()
            }
          }
          const crewModal = document.querySelector(
            '[data-tour="vessel-crew-dialog-content"]'
          )
          if (crewModal) {
            const closeBtn = document.querySelector<HTMLElement>(
              '[data-tour="vessel-crew-dialog-content"] button[aria-label*="close" i], [data-tour="vessel-crew-dialog-content"] button[aria-label*="tutup" i], button[data-slot="dialog-close"], button[aria-label="Close"]'
            )
            if (closeBtn) {
              closeBtn.click()
            }
          }
          const formModal = document.querySelector(
            '[data-tour="vessel-form-modal-dialog"]'
          )
          if (formModal) {
            const closeBtn = document.querySelector<HTMLElement>(
              '[data-tour="vessel-form-modal-dialog"] button[aria-label*="close" i], [data-tour="vessel-form-modal-dialog"] button[aria-label*="tutup" i], button[data-slot="dialog-close"], button[aria-label="Close"]'
            )
            if (closeBtn) {
              closeBtn.click()
            }
          }
        },
      })

      activeDriverInstance = instance
      const firstStep = executableSteps[0]
      if (
        firstStep.path &&
        firstStep.path !== location.pathname &&
        typeof document !== "undefined" &&
        !document.querySelector(firstStep.targetSelector)
      ) {
        navigate(firstStep.path)
        instance.drive(0)
        void waitForElement(firstStep.targetSelector, 1800).then((found) => {
          if (found && activeDriverInstance === instance) {
            instance.moveTo(0)
          }
        })
      } else {
        instance.drive(0)
      }

      return executableSteps
    },
    [hasPermission, location.pathname, navigate, t, userId]
  )

  const startTour = useCallback(
    (tourId: string): TourStep[] => {
      const steps = launchTourDriver(tourId)
      setCompletionVersion((v) => v + 1)
      return steps
    },
    [launchTourDriver]
  )

  useEffect(() => {
    if (!options?.autoStartWelcome) return
    if (userId === undefined) return

    const welcomeKey = getTourStorageKey(userId, "tour-welcome")
    if (autoStartedRef.current === welcomeKey) return

    if (!isTourCompleted(userId, "tour-welcome")) {
      autoStartedRef.current = welcomeKey
      launchTourDriver("tour-welcome")
    }
  }, [options?.autoStartWelcome, launchTourDriver, userId])

  return {
    availableTours,
    startTour,
    isTourDone,
    completedTours,
  }
}
