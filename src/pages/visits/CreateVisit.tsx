import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { isAxiosError, isCancel } from "axios"
import { toast } from "sonner"
import api from "@/lib/axios"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandEmpty,
} from "@/components/ui/command"
import { Loader2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CreateVisit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const idInputRef = useRef<HTMLInputElement>(null)

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [openKtp, setOpenKtp] = useState(false)
  const [openName, setOpenName] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [staffList, setStaffList] = useState<any[]>([])
  const [cardList, setCardList] = useState<any[]>([])
  const [vehicleList, setVehicleList] = useState<any[]>([])

  // Combobox standard states
  const [openStaff, setOpenStaff] = useState(false)
  const [openCard, setOpenCard] = useState(false)
  const [openVehicle, setOpenVehicle] = useState(false)

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [staffRes, cardRes, vehicleRes] = await Promise.all([
          api.get("/staffs"),
          api.get("/cards"),
          api.get("/vehicle-cards"),
        ])
        setStaffList(staffRes.data)
        const availableCards = cardRes.data.filter(
          (c: any) => c.status === "available"
        )
        setCardList(availableCards)
        const availableVehicles = vehicleRes.data.filter(
          (c: any) => c.status === "available"
        )
        setVehicleList(availableVehicles)
      } catch (error) {
        console.error("Failed to load master data", error)
      }
    }
    fetchMasterData()

    // Auto focus
    if (idInputRef.current) {
      idInputRef.current.focus()
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(timer)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      // Abort any in-flight visitor search so a late response can't set state
      // after unmount.
      abortRef.current?.abort()
    }
  }, [])

  const [form, setForm] = useState<{
    id_type: string
    id_number: string
    name: string
    company: string
    purpose: string
    staff_id: string
    card_ids: string[]
    vehicle_card_id: string
    vehicle_no: string
  }>({
    id_type: "ktp",
    id_number: "",
    name: "",
    company: "",
    purpose: "",
    staff_id: "",
    card_ids: [],
    vehicle_card_id: "",
    vehicle_no: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string | string[]) => {
    setForm({ ...form, [name]: value })
  }

  // Trigger API Search logic
  const searchVisitor = (query: string, source: "ktp" | "name") => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    // Abort any request already in flight so responses can't land out of order.
    abortRef.current?.abort()

    if (!query || query.length < 2) {
      setSuggestions([])
      if (source === "ktp") setOpenKtp(false)
      if (source === "name") setOpenName(false)
      return
    }

    if (source === "ktp") {
      setOpenKtp(true)
      setOpenName(false)
    } else {
      setOpenName(true)
      setOpenKtp(false)
    }

    setSearching(true)

    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await api.get("/visits/search", {
          params: { q: query },
          signal: controller.signal,
        })
        setSuggestions(res.data)
      } catch (err) {
        // A superseded keystroke aborts the previous request; that's expected.
        if (!isCancel(err)) console.error(err)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)
  }

  const selectVisitor = (visitor: any) => {
    setForm((prev) => ({
      ...prev,
      id_type: visitor.id_type || "ktp",
      id_number: visitor.id_number,
      name: visitor.name,
      company: visitor.company || "",
    }))
    // Still allow selection — the backend refuses at submit — but warn the operator.
    if (visitor.is_blacklisted) {
      toast.warning("This visitor is blacklisted", {
        description: visitor.blacklist_reason ?? undefined,
      })
    }
    setOpenKtp(false)
    setOpenName(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.staff_id || form.card_ids.length === 0) {
      toast.error("Please select Host Staff and at least 1 ID Card")
      return
    }

    setLoading(true)
    try {
      const res = await api.post("/visits", form)
      navigate("/visits/print", { state: { visit: res.data.visit } })
    } catch (err) {
      console.error("Validation or API error", err)

      // Default fallback message.
      let message =
        "Gagal merekam data kunjungan. Pastikan API dan Master Data valid."
      let reason: string | undefined

      // Surface the real backend cause so the gate operator can tell a
      // blacklisted visitor (422 + reason) from an already-checked-in one,
      // a card-in-use conflict, or master/server down (503).
      if (isAxiosError(err)) {
        const status = err.response?.status
        const data = err.response?.data as
          | { message?: string; reason?: string }
          | undefined

        if ((status === 422 || status === 503) && data?.message) {
          message = data.message
          if (data.reason) reason = data.reason
        }
      }

      toast.error(
        message,
        reason ? { description: `Reason: ${reason}` } : undefined
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Add New Visit</h1>
          <p className="text-muted-foreground">
            Add visitor data to the input below.
          </p>
        </div>
      </div>

      <div className="absolute top-6 right-6 hidden text-right sm:block">
        <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
          Current Time
        </p>
        <div className="mt-1 inline-block rounded bg-zinc-100 px-3 py-1 font-mono text-2xl font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
          {currentTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* ID Type */}
          <div className="space-y-2">
            <Label>ID Type</Label>
            <select
              value={form.id_type}
              onChange={(e) => setForm({ ...form, id_type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="ktp">KTP</option>
              <option value="sim">SIM</option>
              <option value="passport">Passport</option>
            </select>
          </div>

          {/* ID Number */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="id_number">ID Number</Label>
            <Popover open={openKtp} onOpenChange={setOpenKtp}>
              <PopoverAnchor asChild>
                <Input
                  ref={idInputRef}
                  id="id_number"
                  name="id_number"
                  value={form.id_number}
                  onChange={(e) => {
                    handleChange(e)
                    searchVisitor(e.target.value, "ktp")
                  }}
                  onFocus={() => {
                    if (form.id_number.length >= 2) setOpenKtp(true)
                  }}
                  required
                  autoComplete="off"
                  placeholder={
                    form.id_type === "ktp"
                      ? "Type KTP number..."
                      : form.id_type === "sim"
                        ? "Type SIM number..."
                        : "Type Passport ID Number..."
                  }
                />
              </PopoverAnchor>
              <PopoverContent
                className="w-[350px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandGroup>
                      {searching ? (
                        <div className="flex items-center justify-center p-4 text-sm text-zinc-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Searching visitor database...
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.id_number}
                            onSelect={() => selectVisitor(s)}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {s.id_number}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {s.name} - {s.company || "No Company"}
                              </span>
                            </div>
                            {s.is_blacklisted && (
                              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                                BLACKLISTED
                              </span>
                            )}
                          </CommandItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-zinc-500">
                          New visitor detected. Fill out the rest of form to
                          save.
                        </div>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Visitor Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Visitor Name</Label>
          <Popover open={openName} onOpenChange={setOpenName}>
            <PopoverAnchor asChild>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => {
                  handleChange(e)
                  searchVisitor(e.target.value, "name")
                }}
                onFocus={() => {
                  if (form.name.length >= 2) setOpenName(true)
                }}
                required
                autoComplete="off"
                placeholder="Type Name..."
              />
            </PopoverAnchor>
            <PopoverContent
              className="w-[350px] p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    {searching ? (
                      <div className="flex items-center justify-center p-4 text-sm text-zinc-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.id_number}
                          onSelect={() => selectVisitor(s)}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-xs text-zinc-500">
                              {s.id_number} - {s.company || "No Company"}
                            </span>
                          </div>
                          {s.is_blacklisted && (
                            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                              BLACKLISTED
                            </span>
                          )}
                        </CommandItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-zinc-500">
                        No visitors found. Type to save as new.
                      </div>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company / Agency (Optional)</Label>
          <Input
            id="company"
            name="company"
            value={form.company}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose of Visit</Label>
          <Input
            id="purpose"
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="staff_id">Host Staff</Label>
            <Popover open={openStaff} onOpenChange={setOpenStaff}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !form.staff_id && "text-muted-foreground"
                  )}
                >
                  {form.staff_id
                    ? staffList.find(
                        (item) => item.id.toString() === form.staff_id
                      )?.name
                    : "Select Staff..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase()))
                      return 1
                    return 0
                  }}
                >
                  <CommandInput placeholder="Search staff..." />
                  <CommandList>
                    <CommandEmpty>No staff found.</CommandEmpty>
                    <CommandGroup>
                      {staffList.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.name} ${item.department} ${item.id}`}
                          onSelect={() => {
                            handleSelectChange("staff_id", item.id.toString())
                            setOpenStaff(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.staff_id === item.id.toString()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-xs text-zinc-500">
                              {item.department}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <Label htmlFor="card_ids">Assign ID Cards (Multi-select)</Label>
            <Popover open={openCard} onOpenChange={setOpenCard}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    form.card_ids.length === 0 && "text-muted-foreground"
                  )}
                >
                  {form.card_ids.length > 0
                    ? form.card_ids
                        .map(
                          (id) =>
                            cardList.find((c) => c.id.toString() === id)
                              ?.card_no
                        )
                        .join(", ")
                    : "Select Available Cards..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase()))
                      return 1
                    return 0
                  }}
                >
                  <CommandInput placeholder="Search cards..." />
                  <CommandList>
                    <CommandEmpty>No card found.</CommandEmpty>
                    <CommandGroup>
                      {cardList.map((item) => {
                        const isSelected = form.card_ids.includes(
                          item.id.toString()
                        )
                        return (
                          <CommandItem
                            key={item.id}
                            value={`${item.card_no} ${item.id}`}
                            onSelect={() => {
                              const newSelection = isSelected
                                ? form.card_ids.filter(
                                    (id) => id !== item.id.toString()
                                  )
                                : [...form.card_ids, item.id.toString()]
                              handleSelectChange("card_ids", newSelection)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.card_no}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="vehicle_card_id">
              Assign Vehicle Card (Optional)
            </Label>
            <Popover open={openVehicle} onOpenChange={setOpenVehicle}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !form.vehicle_card_id && "text-muted-foreground"
                  )}
                >
                  {form.vehicle_card_id
                    ? vehicleList.find(
                        (item) => item.id.toString() === form.vehicle_card_id
                      )?.card_no
                    : "Select Available Vehicle Card..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 md:w-[350px]">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase()))
                      return 1
                    return 0
                  }}
                >
                  <CommandInput placeholder="Search vehicle card..." />
                  <CommandList>
                    <CommandEmpty>No vehicle card found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          handleSelectChange("vehicle_card_id", "")
                          setOpenVehicle(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !form.vehicle_card_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-zinc-500 italic">None</span>
                      </CommandItem>
                      {vehicleList.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.card_no} ${item.id}`}
                          onSelect={() => {
                            handleSelectChange(
                              "vehicle_card_id",
                              item.id.toString()
                            )
                            setOpenVehicle(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.vehicle_card_id === item.id.toString()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {item.card_no}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_no">Vehicle Number (Optional)</Label>
            <Input
              id="vehicle_no"
              name="vehicle_no"
              className="w-full"
              value={form.vehicle_no}
              onChange={handleChange}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Processing..." : "Save & Print Ticket"}
        </Button>
      </form>
    </div>
  )
}
