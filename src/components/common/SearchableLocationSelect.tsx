import { useState, useMemo } from "react"
import { useTranslation } from "@/context/I18nContext"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Ship, Building2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchableLocationOption {
  id: number | string
  name: string
  code?: string | null
  type?: string | null
  vessel_type?: string | null
  call_sign?: string | null
  flag?: string | null
  port?: string | null
  captain?: string | null
  pic?: string | null
  is_active?: boolean | number
}

interface SearchableLocationSelectProps {
  id?: string
  name?: string
  ariaLabel?: string
  value: string
  onValueChange?: (value: string) => void
  onChange?: (value: string) => void
  options: SearchableLocationOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  clearLabel?: string
  className?: string
}

const getTypeBadgeLabel = (
  opt: SearchableLocationOption,
  t: (path: string, defaultValue?: string) => string
): string => {
  if (opt.vessel_type) return opt.vessel_type
  switch (opt.type) {
    case "repair_vessel":
      return t("locations.type_repair_vessel", "Kapal Perbaikan")
    case "tug_boat":
      return t("locations.type_tug_boat", "Tug Boat")
    case "barge":
      return t("locations.type_barge", "Tongkang (Barge)")
    case "location":
      return t("locations.type_land", "Lokasi Darat")
    default:
      return opt.type || t("locations.type_location", "Lokasi")
  }
}

export default function SearchableLocationSelect({
  id,
  name,
  ariaLabel,
  value,
  onValueChange,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  required = false,
  allowClear = false,
  clearLabel,
  className,
}: SearchableLocationSelectProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder =
    placeholder ??
    t("create_visit.location_select_placeholder", "-- Pilih lokasi / kapal --")
  const resolvedSearchPlaceholder =
    searchPlaceholder ??
    t(
      "create_visit.location_search_placeholder",
      "Cari nama kapal/lokasi, IMO No, Captain, PIC, Call Sign..."
    )
  const resolvedEmptyMessage =
    emptyMessage ??
    t("create_visit.location_empty", "Lokasi atau kapal tidak ditemukan.")
  const resolvedClearLabel =
    clearLabel ?? t("common.none", "-- Tidak dipilih --")
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const triggerChange = (val: string) => {
    onValueChange?.(val)
    onChange?.(val)
  }

  const selectedOption = useMemo(
    () =>
      options.find((opt) => String(opt.id) === String(value)) || null,
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const land = options.filter((opt) => !opt.type || opt.type === "location")
      const vessels = options.filter((opt) =>
        Boolean(opt.type && opt.type !== "location")
      )
      return [...land, ...vessels]
    }
    return options.filter((opt) => {
      const haystack = [
        opt.name,
        opt.code,
        opt.vessel_type,
        opt.type,
        opt.captain,
        opt.pic,
        opt.call_sign,
        opt.flag,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [options, query])

  const visibleOptions = useMemo(() => {
    const limit = 80
    const sliced = filteredOptions.slice(0, limit)
    if (
      selectedOption &&
      !sliced.some((o) => String(o.id) === String(selectedOption.id))
    ) {
      return [selectedOption, ...sliced]
    }
    return sliced
  }, [filteredOptions, selectedOption])

  const isVessel = (opt: SearchableLocationOption) =>
    Boolean(opt.type && opt.type !== "location")

  return (
    <div className={cn("relative", className)}>
      {/* Synchronized native select for accessibility, form semantics & unit test compatibility */}
      <select
        id={id}
        name={name}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => triggerChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      >
        <option value="">{resolvedPlaceholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.name}
            {opt.code && isVessel(opt) ? ` (IMO: ${opt.code})` : ""}
            {opt.captain ? ` - Capt: ${opt.captain}` : ""}
          </option>
        ))}
      </select>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery("")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            data-testid="location-select-trigger"
            aria-label={ariaLabel}
            aria-expanded={open}
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "w-full justify-between bg-white text-left text-xs font-normal h-auto min-h-10 py-1.5 px-3 dark:bg-zinc-950",
              !selectedOption && "text-muted-foreground"
            )}
          >
            {selectedOption ? (
              <div className="flex flex-wrap items-center gap-1.5 truncate pr-2">
                {isVessel(selectedOption) ? (
                  <Ship className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                )}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedOption.name}
                </span>
                {selectedOption.code && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {isVessel(selectedOption)
                      ? `IMO: ${selectedOption.code}`
                      : selectedOption.code}
                  </span>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 font-normal"
                >
                  {getTypeBadgeLabel(selectedOption, t)}
                </Badge>
                {selectedOption.captain && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    • Capt: {selectedOption.captain}
                  </span>
                )}
              </div>
            ) : (
              <span>{resolvedPlaceholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 md:w-[460px]"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={resolvedSearchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>{resolvedEmptyMessage}</CommandEmpty>
              <CommandGroup>
                {allowClear && value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      triggerChange("")
                      setOpen(false)
                      setQuery("")
                    }}
                    className="text-xs text-zinc-500 italic"
                  >
                    <X className="mr-2 h-3.5 w-3.5" />
                    {resolvedClearLabel}
                  </CommandItem>
                )}

                {visibleOptions.map((opt) => {
                  const isSelected = String(opt.id) === String(value)
                  const vessel = isVessel(opt)

                  return (
                    <CommandItem
                      key={opt.id}
                      value={String(opt.id)}
                      onSelect={() => {
                        triggerChange(String(opt.id))
                        setOpen(false)
                        setQuery("")
                      }}
                      className="items-start py-2"
                    >
                      <Check
                        className={cn(
                          "mr-2 mt-0.5 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100 text-emerald-600" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {vessel ? (
                            <Ship className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          )}
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {opt.name}
                          </span>
                          {opt.code && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.2 font-mono text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {vessel ? `IMO: ${opt.code}` : opt.code}
                            </span>
                          )}
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.2 text-[10px] font-medium",
                              vessel
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}
                          >
                            {getTypeBadgeLabel(opt, t)}
                          </span>
                        </div>

                        {vessel &&
                          (opt.captain || opt.pic || opt.call_sign || opt.flag) && (
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {opt.captain && (
                                <span>
                                  Captain:{" "}
                                  <strong className="text-zinc-700 dark:text-zinc-200">
                                    {opt.captain}
                                  </strong>
                                </span>
                              )}
                              {opt.pic && (
                                <span>
                                  PIC/Note:{" "}
                                  <strong className="text-zinc-700 dark:text-zinc-200">
                                    {opt.pic}
                                  </strong>
                                </span>
                              )}
                              {opt.call_sign && <span>CS: {opt.call_sign}</span>}
                              {opt.flag && <span>Flag: {opt.flag}</span>}
                            </div>
                          )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {filteredOptions.length > 80 && (
                <div className="border-t border-zinc-100 px-3 py-1.5 text-center text-[11px] text-zinc-500 dark:border-zinc-800">
                  {t(
                    "common.showing_limit",
                    "Menampilkan 80 dari {{total}} lokasi/kapal — ketik di kotak pencarian untuk menyaring.",
                    { total: filteredOptions.length }
                  )}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
