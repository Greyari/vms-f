import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useTranslation } from "@/context/I18nContext"
import { useAppTour } from "@/hooks/useAppTour"
import { permissionFor } from "@/lib/routePermissions"
import {
  APP_OVERVIEW_GROUPS,
  APP_OVERVIEW_GENERAL_TIPS,
  type OverviewPagePath,
} from "@/config/appOverview"
import OverviewSimulator from "@/components/OverviewSimulator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  BookOpenCheck,
  Lightbulb,
  Compass,
  RotateCcw,
  Search,
  X,
} from "lucide-react"

export default function AppOverview() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const { availableTours, startTour, isTourDone } = useAppTour({
    autoStartWelcome: true,
  })
  const [openGuidePages, setOpenGuidePages] = useState<Record<string, boolean>>(
    {}
  )
  const [selectedTourId, setSelectedTourId] = useState<string>("tour-welcome")
  const [searchQuery, setSearchQuery] = useState("")

  const activeTourId = useMemo(() => {
    if (availableTours.some((tour) => tour.id === selectedTourId)) {
      return selectedTourId
    }
    return availableTours[0]?.id ?? "tour-welcome"
  }, [availableTours, selectedTourId])

  const canAccess = (path: OverviewPagePath): boolean => {
    if (path === "/") {
      return hasPermission("view_visits")
    }
    const permission = permissionFor(path)
    return permission === undefined || hasPermission(permission)
  }

  const togglePageGuides = (pageId: string, currentExpanded: boolean) => {
    setOpenGuidePages((prev) => ({
      ...prev,
      [pageId]: !currentExpanded,
    }))
  }

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return APP_OVERVIEW_GROUPS
    }

    return APP_OVERVIEW_GROUPS.map((group) => {
      const filteredPages = group.pages.filter((page) => {
        const pageTitle = t(page.titleKey).toLowerCase()
        const pagePurpose = page.purposeKey ? t(page.purposeKey).toLowerCase() : ""
        const path = page.path.toLowerCase()

        if (
          pageTitle.includes(q) ||
          pagePurpose.includes(q) ||
          path.includes(q)
        ) {
          return true
        }

        if (
          page.featureKeys?.some((fKey) =>
            t(fKey).toLowerCase().includes(q)
          )
        ) {
          return true
        }

        if (page.guides && page.guides.length > 0) {
          return page.guides.some((guide) => {
            const guideTitle = t(guide.titleKey).toLowerCase()
            const tip = guide.tipKey ? t(guide.tipKey).toLowerCase() : ""
            const steps = guide.stepKeys
              ? guide.stepKeys.map((s) => t(s).toLowerCase())
              : []

            return (
              guideTitle.includes(q) ||
              tip.includes(q) ||
              steps.some((stepText) => stepText.includes(q))
            )
          })
        }

        return false
      })

      return {
        ...group,
        pages: filteredPages,
      }
    }).filter((group) => group.pages.length > 0)
  }, [searchQuery, t])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("app_overview.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t("app_overview.subtitle")}
          </p>
        </div>

        {availableTours.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label={t("app_overview.tour_select_label")}
              value={activeTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {availableTours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {t(tour.titleKey)}
                </option>
              ))}
            </select>

            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => startTour(activeTourId)}
            >
              <Compass className="h-3.5 w-3.5" />
              {t("app_overview.tour_start")}
            </Button>

            {isTourDone(activeTourId) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => startTour(activeTourId)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("app_overview.tour_repeat")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Visual Simulator: main window with caption bar */}
      <div
        id="key-workflows"
        className="scroll-mt-20 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Caption bar */}
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {t("app_overview.flow_section_title")}
          </h2>
          <Badge variant="outline" className="text-[11px] font-normal">
            Mode Latihan
          </Badge>
        </div>

        {/* Window content */}
        <div className="p-4 sm:p-6">
          <OverviewSimulator onStartTour={(tourId) => startTour(tourId)} />
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Label htmlFor="overview-search" className="sr-only">
          {t("app_overview.search_label")}
        </Label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          id="overview-search"
          aria-label={t("app_overview.search_label")}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("app_overview.search_placeholder")}
          className="h-10 pl-9 pr-8 text-sm bg-white dark:bg-zinc-950"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label={t("app_overview.clear_search")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Page groups */}
      <div className="space-y-10">
        {filteredGroups.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">
              {t("app_overview.empty_search")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs"
            >
              {t("app_overview.reset_search")}
            </Button>
          </div>
        ) : (
          filteredGroups.map((group) => (
          <section
            key={group.id}
            id={`group-${group.id}`}
            data-tour={`overview-group-${group.id}`}
            className="scroll-mt-20 space-y-4"
          >
            <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(group.titleKey)}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t(group.descriptionKey)}
                </p>
              </div>
              {group.badgeKey && (
                <Badge
                  variant="secondary"
                  className="w-fit text-xs font-normal"
                >
                  {t(group.badgeKey)}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.pages.map((page) => {
                const Icon = page.icon
                const allowed = canAccess(page.path)
                const pageTitle = t(page.titleKey)
                const hasGuides = Boolean(page.guides && page.guides.length > 0)
                const pageGuideMatchesSearch =
                  searchQuery.trim().length > 0 &&
                  Boolean(
                    page.guides?.some((guide) => {
                      const q = searchQuery.trim().toLowerCase()
                      const guideTitle = t(guide.titleKey).toLowerCase()
                      const tip = guide.tipKey
                        ? t(guide.tipKey).toLowerCase()
                        : ""
                      const steps = guide.stepKeys
                        ? guide.stepKeys.map((s) => t(s).toLowerCase())
                        : []
                      return (
                        guideTitle.includes(q) ||
                        tip.includes(q) ||
                        steps.some((stepText) => stepText.includes(q))
                      )
                    })
                  )
                const isGuidesExpanded =
                  openGuidePages[page.id] ?? pageGuideMatchesSearch

                return (
                  <article
                    key={page.id}
                    data-tour={`overview-card-${page.id}`}
                    className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  >
                    <header className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {pageTitle}
                            </h3>
                            <code className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              {page.path}
                            </code>
                          </div>
                        </div>
                      </div>
                    </header>

                    <div className="my-4 flex-1 space-y-3">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          {t("app_overview.purpose_heading")}
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {t(page.purposeKey)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                          {t("app_overview.features_heading")}
                        </p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {page.featureKeys.map((fKey) => (
                            <li key={fKey}>{t(fKey)}</li>
                          ))}
                        </ul>
                      </div>

                      {allowed && hasGuides && (
                        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-900">
                          <button
                            type="button"
                            aria-expanded={isGuidesExpanded}
                            aria-controls={`guides-panel-${page.id}`}
                            onClick={() =>
                              togglePageGuides(page.id, isGuidesExpanded)
                            }
                            className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <BookOpenCheck className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                              <span>
                                {isGuidesExpanded
                                  ? t("app_overview.guide_hide")
                                  : t("app_overview.guide_show")}{" "}
                                ({page.guides!.length})
                              </span>
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 motion-reduce:transition-none dark:text-zinc-400 ${
                                isGuidesExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isGuidesExpanded && (
                            <div
                              id={`guides-panel-${page.id}`}
                              className="mt-3 space-y-3"
                            >
                              <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                                {t("app_overview.guides_heading")}
                              </p>
                              {page.guides!.map((guide) => {
                                const GuideIcon = guide.icon
                                const targetHref = `${page.path}${guide.actionQuery ?? ""}`

                                return (
                                  <div
                                    key={guide.id}
                                    className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                                  >
                                    <div className="flex items-center gap-2">
                                      <GuideIcon className="h-3.5 w-3.5 shrink-0 text-zinc-700 dark:text-zinc-300" />
                                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t(guide.titleKey)}
                                      </h4>
                                    </div>

                                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-zinc-600 dark:text-zinc-300">
                                      {guide.stepKeys.map((stepKey) => (
                                        <li key={stepKey}>{t(stepKey)}</li>
                                      ))}
                                    </ol>

                                    {guide.tipKey && (
                                      <div className="mt-2.5 flex items-start gap-1.5 rounded border border-amber-200/80 bg-amber-50/70 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <p>
                                          <span className="font-semibold">
                                            {t("app_overview.guide_tip_label")}
                                            :{" "}
                                          </span>
                                          {t(guide.tipKey)}
                                        </p>
                                      </div>
                                    )}

                                    <div className="mt-2.5 flex justify-end">
                                      <Link
                                        to={targetHref}
                                        data-tour={`try-now-${page.id}-${guide.id}`}
                                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                                      >
                                        {t("app_overview.guide_try_now")}
                                        <span className="sr-only">
                                          {" "}
                                          - {t(guide.titleKey)}
                                        </span>
                                        <ArrowUpRight className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <footer className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                      {allowed ? (
                        <>
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {t("app_overview.access_allowed")}
                          </Badge>
                          <Link
                            to={page.path}
                            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            {t("app_overview.open_page")}
                            <span className="sr-only"> {pageTitle}</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          <Lock className="mr-1 h-3 w-3" />
                          {t("app_overview.access_denied")}
                        </Badge>
                      )}
                    </footer>
                  </article>
                )
              })}
            </div>
          </section>
        )))}
      </div>

      {/* General Tips Section */}
      <section
        id="general-tips"
        className="scroll-mt-20 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("app_overview.tips_section_title")}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("app_overview.tips_section_subtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {APP_OVERVIEW_GENERAL_TIPS.map((tip) => {
            const TipIcon = tip.icon
            return (
              <article
                key={tip.id}
                className="rounded-md border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <header className="flex items-center gap-2">
                  <TipIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t(tip.titleKey)}
                  </h3>
                </header>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {t(tip.descriptionKey)}
                </p>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}