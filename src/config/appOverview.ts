import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Ship,
  Building2,
  Users,
  CreditCard,
  ShieldOff,
  FileText,
  Settings,
  KeyRound,
  UserCircle,
  BookOpen,
  Globe,
  Moon,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react"
import type { GuardedPath } from "@/lib/routePermissions"

export type OverviewPagePath = "/" | GuardedPath

export type OverviewRoleKey = "administrator" | "supervisor" | "security"

export interface OverviewGuide {
  id: string
  icon: LucideIcon
  titleKey: string
  stepKeys: string[] // 3-7 langkah berurutan
  tipKey?: string
  actionQuery?: string // contoh "?action=create"
}

export interface OverviewPageItem {
  id: string
  path: OverviewPagePath
  icon: LucideIcon
  titleKey: string
  purposeKey: string
  featureKeys: string[]
  roles: OverviewRoleKey[]
  guides?: OverviewGuide[]
}

export interface OverviewGroupConfig {
  id: string
  titleKey: string
  descriptionKey: string
  badgeKey?: string
  pages: OverviewPageItem[]
}

export interface OverviewGeneralTip {
  id: string
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
}

export const APP_OVERVIEW_GROUPS: OverviewGroupConfig[] = [
  {
    id: "overview",
    titleKey: "app_overview.groups.overview.title",
    descriptionKey: "app_overview.groups.overview.description",
    pages: [
      {
        id: "dashboard",
        path: "/",
        icon: LayoutDashboard,
        titleKey: "app_overview.pages.dashboard.title",
        purposeKey: "app_overview.pages.dashboard.purpose",
        featureKeys: [
          "app_overview.pages.dashboard.features.metrics",
          "app_overview.pages.dashboard.features.weekly_trend",
          "app_overview.pages.dashboard.features.active_visitors",
        ],
        roles: ["administrator", "supervisor", "security"],
      },
    ],
  },
  {
    id: "visitor-management",
    titleKey: "app_overview.groups.visitor_management.title",
    descriptionKey: "app_overview.groups.visitor_management.description",
    pages: [
      {
        id: "add-visit",
        path: "/visits/create",
        icon: ClipboardList,
        titleKey: "app_overview.pages.add_visit.title",
        purposeKey: "app_overview.pages.add_visit.purpose",
        featureKeys: [
          "app_overview.pages.add_visit.features.registration_modes",
          "app_overview.pages.add_visit.features.id_detection",
          "app_overview.pages.add_visit.features.blacklist_alert",
          "app_overview.pages.add_visit.features.host_and_cards",
          "app_overview.pages.add_visit.features.print_pass",
        ],
        roles: ["administrator", "supervisor", "security"],
        guides: [
          {
            id: "add-visit",
            icon: ClipboardList,
            titleKey: "app_overview.pages.add_visit.guides.add_visit.title",
            // TODO: verifikasi nama tombol simpan/cetak pada UI asli CreateVisit.tsx
            stepKeys: [
              "app_overview.pages.add_visit.guides.add_visit.steps.1",
              "app_overview.pages.add_visit.guides.add_visit.steps.2",
              "app_overview.pages.add_visit.guides.add_visit.steps.3",
              "app_overview.pages.add_visit.guides.add_visit.steps.4",
              "app_overview.pages.add_visit.guides.add_visit.steps.5",
            ],
            tipKey: "app_overview.pages.add_visit.guides.add_visit.tip",
          },
        ],
      },
      {
        id: "visit-history",
        path: "/visits/history",
        icon: History,
        titleKey: "app_overview.pages.visit_history.title",
        purposeKey: "app_overview.pages.visit_history.purpose",
        featureKeys: [
          "app_overview.pages.visit_history.features.quick_search",
          "app_overview.pages.visit_history.features.status_filter",
          "app_overview.pages.visit_history.features.checkout",
          "app_overview.pages.visit_history.features.reprint_and_edit",
          "app_overview.pages.visit_history.features.auto_card_release",
        ],
        roles: ["administrator", "supervisor", "security"],
        guides: [
          {
            id: "checkout",
            icon: CheckCircle2,
            titleKey: "app_overview.pages.visit_history.guides.checkout.title",
            // TODO: verifikasi label tombol Check-out & Bulk Check-Out dengan UI asli VisitHistory.tsx
            stepKeys: [
              "app_overview.pages.visit_history.guides.checkout.steps.1",
              "app_overview.pages.visit_history.guides.checkout.steps.2",
              "app_overview.pages.visit_history.guides.checkout.steps.3",
              "app_overview.pages.visit_history.guides.checkout.steps.4",
            ],
            tipKey: "app_overview.pages.visit_history.guides.checkout.tip",
          },
          {
            id: "reprint-edit",
            icon: FileText,
            titleKey: "app_overview.pages.visit_history.guides.reprint_edit.title",
            // TODO: verifikasi label aksi Reprint Pass dan Edit dengan UI asli VisitHistory.tsx
            stepKeys: [
              "app_overview.pages.visit_history.guides.reprint_edit.steps.1",
              "app_overview.pages.visit_history.guides.reprint_edit.steps.2",
              "app_overview.pages.visit_history.guides.reprint_edit.steps.3",
            ],
            tipKey: "app_overview.pages.visit_history.guides.reprint_edit.tip",
          },
        ],
      },
      {
        id: "crew-arrivals",
        path: "/vessel-arrivals",
        icon: Ship,
        titleKey: "app_overview.pages.crew_arrivals.title",
        purposeKey: "app_overview.pages.crew_arrivals.purpose",
        featureKeys: [
          "app_overview.pages.crew_arrivals.features.unified_search",
          "app_overview.pages.crew_arrivals.features.register_arrival",
          "app_overview.pages.crew_arrivals.features.manifest_tabs",
          "app_overview.pages.crew_arrivals.features.crew_actions",
          "app_overview.pages.crew_arrivals.features.export_and_depart",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "register-arrival",
            icon: Ship,
            titleKey: "app_overview.pages.crew_arrivals.guides.register_arrival.title",
            // TODO: verifikasi dengan UI asli VesselArrivals.tsx & pertimbangkan dukungan ?action=create via useSearchParams
            stepKeys: [
              "app_overview.pages.crew_arrivals.guides.register_arrival.steps.1",
              "app_overview.pages.crew_arrivals.guides.register_arrival.steps.2",
              "app_overview.pages.crew_arrivals.guides.register_arrival.steps.3",
              "app_overview.pages.crew_arrivals.guides.register_arrival.steps.4",
            ],
            tipKey: "app_overview.pages.crew_arrivals.guides.register_arrival.tip",
          },
          {
            id: "manage-manifest",
            icon: Users,
            titleKey: "app_overview.pages.crew_arrivals.guides.manage_manifest.title",
            // TODO: verifikasi label tombol Check-In, Check-Out, Detach, dan Transfer dengan UI asli
            stepKeys: [
              "app_overview.pages.crew_arrivals.guides.manage_manifest.steps.1",
              "app_overview.pages.crew_arrivals.guides.manage_manifest.steps.2",
              "app_overview.pages.crew_arrivals.guides.manage_manifest.steps.3",
              "app_overview.pages.crew_arrivals.guides.manage_manifest.steps.4",
            ],
            tipKey: "app_overview.pages.crew_arrivals.guides.manage_manifest.tip",
          },
          {
            id: "export-depart",
            icon: FileSpreadsheet,
            titleKey: "app_overview.pages.crew_arrivals.guides.export_depart.title",
            // TODO: verifikasi label tombol Export Excel & Departed dengan UI asli
            stepKeys: [
              "app_overview.pages.crew_arrivals.guides.export_depart.steps.1",
              "app_overview.pages.crew_arrivals.guides.export_depart.steps.2",
              "app_overview.pages.crew_arrivals.guides.export_depart.steps.3",
            ],
            tipKey: "app_overview.pages.crew_arrivals.guides.export_depart.tip",
          },
        ],
      },
    ],
  },
  {
    id: "master-data",
    titleKey: "app_overview.groups.master_data.title",
    descriptionKey: "app_overview.groups.master_data.description",
    badgeKey: "app_overview.groups.master_data.badge_import_export",
    pages: [
      {
        id: "locations-vessels",
        path: "/master/locations",
        icon: Building2,
        titleKey: "app_overview.pages.locations_vessels.title",
        purposeKey: "app_overview.pages.locations_vessels.purpose",
        featureKeys: [
          "app_overview.pages.locations_vessels.features.yard_zones",
          "app_overview.pages.locations_vessels.features.vessel_details",
          "app_overview.pages.locations_vessels.features.import_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "manage-records",
            icon: Building2,
            titleKey:
              "app_overview.pages.locations_vessels.guides.manage_records.title",
            // TODO: verifikasi label tombol Tambah/Edit/Hapus dengan UI asli Locations.tsx & opsi ?action=create
            stepKeys: [
              "app_overview.pages.locations_vessels.guides.manage_records.steps.1",
              "app_overview.pages.locations_vessels.guides.manage_records.steps.2",
              "app_overview.pages.locations_vessels.guides.manage_records.steps.3",
              "app_overview.pages.locations_vessels.guides.manage_records.steps.4",
            ],
            tipKey:
              "app_overview.pages.locations_vessels.guides.manage_records.tip",
          },
          {
            id: "import-export",
            icon: FileSpreadsheet,
            titleKey:
              "app_overview.pages.locations_vessels.guides.import_export.title",
            // TODO: verifikasi label tombol Import/Export Excel/CSV dengan UI asli Locations.tsx
            stepKeys: [
              "app_overview.pages.locations_vessels.guides.import_export.steps.1",
              "app_overview.pages.locations_vessels.guides.import_export.steps.2",
              "app_overview.pages.locations_vessels.guides.import_export.steps.3",
              "app_overview.pages.locations_vessels.guides.import_export.steps.4",
            ],
            tipKey:
              "app_overview.pages.locations_vessels.guides.import_export.tip",
          },
        ],
      },
      {
        id: "staffs",
        path: "/master/staffs",
        icon: Users,
        titleKey: "app_overview.pages.staffs.title",
        purposeKey: "app_overview.pages.staffs.purpose",
        featureKeys: [
          "app_overview.pages.staffs.features.host_directory",
          "app_overview.pages.staffs.features.department_status",
          "app_overview.pages.staffs.features.import_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "manage-records",
            icon: Users,
            titleKey: "app_overview.pages.staffs.guides.manage_records.title",
            // TODO: verifikasi label tombol Tambah/Edit/Hapus dengan UI asli Staffs.tsx & opsi ?action=create
            stepKeys: [
              "app_overview.pages.staffs.guides.manage_records.steps.1",
              "app_overview.pages.staffs.guides.manage_records.steps.2",
              "app_overview.pages.staffs.guides.manage_records.steps.3",
              "app_overview.pages.staffs.guides.manage_records.steps.4",
            ],
            tipKey: "app_overview.pages.staffs.guides.manage_records.tip",
          },
          {
            id: "import-export",
            icon: FileSpreadsheet,
            titleKey: "app_overview.pages.staffs.guides.import_export.title",
            // TODO: verifikasi label tombol Import/Export Excel/CSV dengan UI asli Staffs.tsx
            stepKeys: [
              "app_overview.pages.staffs.guides.import_export.steps.1",
              "app_overview.pages.staffs.guides.import_export.steps.2",
              "app_overview.pages.staffs.guides.import_export.steps.3",
              "app_overview.pages.staffs.guides.import_export.steps.4",
            ],
            tipKey: "app_overview.pages.staffs.guides.import_export.tip",
          },
        ],
      },
      {
        id: "cards",
        path: "/master/cards",
        icon: CreditCard,
        titleKey: "app_overview.pages.cards.title",
        purposeKey: "app_overview.pages.cards.purpose",
        featureKeys: [
          "app_overview.pages.cards.features.physical_cards",
          "app_overview.pages.cards.features.status_tracking",
          "app_overview.pages.cards.features.import_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "manage-records",
            icon: CreditCard,
            titleKey: "app_overview.pages.cards.guides.manage_records.title",
            // TODO: verifikasi label tombol Tambah/Edit/Hapus dengan UI asli Cards.tsx & opsi ?action=create
            stepKeys: [
              "app_overview.pages.cards.guides.manage_records.steps.1",
              "app_overview.pages.cards.guides.manage_records.steps.2",
              "app_overview.pages.cards.guides.manage_records.steps.3",
              "app_overview.pages.cards.guides.manage_records.steps.4",
            ],
            tipKey: "app_overview.pages.cards.guides.manage_records.tip",
          },
          {
            id: "import-export",
            icon: FileSpreadsheet,
            titleKey: "app_overview.pages.cards.guides.import_export.title",
            // TODO: verifikasi label tombol Import/Export Excel/CSV dengan UI asli Cards.tsx
            stepKeys: [
              "app_overview.pages.cards.guides.import_export.steps.1",
              "app_overview.pages.cards.guides.import_export.steps.2",
              "app_overview.pages.cards.guides.import_export.steps.3",
              "app_overview.pages.cards.guides.import_export.steps.4",
            ],
            tipKey: "app_overview.pages.cards.guides.import_export.tip",
          },
        ],
      },
      {
        id: "card-vehicles",
        path: "/master/vehicle-cards",
        icon: CreditCard,
        titleKey: "app_overview.pages.card_vehicles.title",
        purposeKey: "app_overview.pages.card_vehicles.purpose",
        featureKeys: [
          "app_overview.pages.card_vehicles.features.gate_pass",
          "app_overview.pages.card_vehicles.features.plate_pairing",
          "app_overview.pages.card_vehicles.features.import_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "manage-records",
            icon: CreditCard,
            titleKey:
              "app_overview.pages.card_vehicles.guides.manage_records.title",
            // TODO: verifikasi label tombol Tambah/Edit/Hapus dengan UI asli VehicleCards.tsx & opsi ?action=create
            stepKeys: [
              "app_overview.pages.card_vehicles.guides.manage_records.steps.1",
              "app_overview.pages.card_vehicles.guides.manage_records.steps.2",
              "app_overview.pages.card_vehicles.guides.manage_records.steps.3",
              "app_overview.pages.card_vehicles.guides.manage_records.steps.4",
            ],
            tipKey: "app_overview.pages.card_vehicles.guides.manage_records.tip",
          },
          {
            id: "import-export",
            icon: FileSpreadsheet,
            titleKey:
              "app_overview.pages.card_vehicles.guides.import_export.title",
            // TODO: verifikasi label tombol Import/Export Excel/CSV dengan UI asli VehicleCards.tsx
            stepKeys: [
              "app_overview.pages.card_vehicles.guides.import_export.steps.1",
              "app_overview.pages.card_vehicles.guides.import_export.steps.2",
              "app_overview.pages.card_vehicles.guides.import_export.steps.3",
              "app_overview.pages.card_vehicles.guides.import_export.steps.4",
            ],
            tipKey: "app_overview.pages.card_vehicles.guides.import_export.tip",
          },
        ],
      },
      {
        id: "visitors",
        path: "/master/visitors",
        icon: Users,
        titleKey: "app_overview.pages.visitors.title",
        purposeKey: "app_overview.pages.visitors.purpose",
        featureKeys: [
          "app_overview.pages.visitors.features.master_archive",
          "app_overview.pages.visitors.features.visit_timeline",
          "app_overview.pages.visitors.features.print_and_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "manage-records",
            icon: Users,
            titleKey: "app_overview.pages.visitors.guides.manage_records.title",
            // TODO: verifikasi label tombol Tambah/Edit/Detail Timeline dengan UI asli Visitors.tsx
            stepKeys: [
              "app_overview.pages.visitors.guides.manage_records.steps.1",
              "app_overview.pages.visitors.guides.manage_records.steps.2",
              "app_overview.pages.visitors.guides.manage_records.steps.3",
              "app_overview.pages.visitors.guides.manage_records.steps.4",
            ],
            tipKey: "app_overview.pages.visitors.guides.manage_records.tip",
          },
          {
            id: "import-export",
            icon: FileSpreadsheet,
            titleKey: "app_overview.pages.visitors.guides.import_export.title",
            // TODO: verifikasi label tombol Cetak Profil, Import & Export dengan UI asli Visitors.tsx
            stepKeys: [
              "app_overview.pages.visitors.guides.import_export.steps.1",
              "app_overview.pages.visitors.guides.import_export.steps.2",
              "app_overview.pages.visitors.guides.import_export.steps.3",
              "app_overview.pages.visitors.guides.import_export.steps.4",
            ],
            tipKey: "app_overview.pages.visitors.guides.import_export.tip",
          },
        ],
      },
      {
        id: "blacklist",
        path: "/master/visitors/blacklist",
        icon: ShieldOff,
        titleKey: "app_overview.pages.blacklist.title",
        purposeKey: "app_overview.pages.blacklist.purpose",
        featureKeys: [
          "app_overview.pages.blacklist.features.block_management",
          "app_overview.pages.blacklist.features.cloud_hub_sync",
          "app_overview.pages.blacklist.features.import_export",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "add-block",
            icon: ShieldOff,
            titleKey: "app_overview.pages.blacklist.guides.add_block.title",
            // TODO: verifikasi label tombol tambah cekal & import Excel dengan UI asli BlacklistedVisitors.tsx
            stepKeys: [
              "app_overview.pages.blacklist.guides.add_block.steps.1",
              "app_overview.pages.blacklist.guides.add_block.steps.2",
              "app_overview.pages.blacklist.guides.add_block.steps.3",
            ],
            tipKey: "app_overview.pages.blacklist.guides.add_block.tip",
          },
          {
            id: "remove-block",
            icon: CheckCircle2,
            titleKey: "app_overview.pages.blacklist.guides.remove_block.title",
            // TODO: verifikasi label tombol Unblacklist dengan UI asli BlacklistedVisitors.tsx
            stepKeys: [
              "app_overview.pages.blacklist.guides.remove_block.steps.1",
              "app_overview.pages.blacklist.guides.remove_block.steps.2",
              "app_overview.pages.blacklist.guides.remove_block.steps.3",
            ],
            tipKey: "app_overview.pages.blacklist.guides.remove_block.tip",
          },
          {
            id: "cloud-sync",
            icon: RefreshCw,
            titleKey: "app_overview.pages.blacklist.guides.cloud_sync.title",
            // TODO: verifikasi label panel Outbox & Cloud Hub Sync dengan UI asli GlobalBlacklistPanel.tsx
            stepKeys: [
              "app_overview.pages.blacklist.guides.cloud_sync.steps.1",
              "app_overview.pages.blacklist.guides.cloud_sync.steps.2",
              "app_overview.pages.blacklist.guides.cloud_sync.steps.3",
            ],
            tipKey: "app_overview.pages.blacklist.guides.cloud_sync.tip",
          },
        ],
      },
    ],
  },
  {
    id: "reports",
    titleKey: "app_overview.groups.reports.title",
    descriptionKey: "app_overview.groups.reports.description",
    pages: [
      {
        id: "visitor-report",
        path: "/reports/visits",
        icon: FileText,
        titleKey: "app_overview.pages.visitor_report.title",
        purposeKey: "app_overview.pages.visitor_report.purpose",
        featureKeys: [
          "app_overview.pages.visitor_report.features.multi_filter",
          "app_overview.pages.visitor_report.features.kpi_summary",
          "app_overview.pages.visitor_report.features.export_excel_pdf",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "filter-kpi",
            icon: FileText,
            titleKey:
              "app_overview.pages.visitor_report.guides.filter_kpi.title",
            // TODO: verifikasi label filter & tombol ekspor dengan UI asli VisitorReport.tsx
            stepKeys: [
              "app_overview.pages.visitor_report.guides.filter_kpi.steps.1",
              "app_overview.pages.visitor_report.guides.filter_kpi.steps.2",
              "app_overview.pages.visitor_report.guides.filter_kpi.steps.3",
              "app_overview.pages.visitor_report.guides.filter_kpi.steps.4",
            ],
            tipKey: "app_overview.pages.visitor_report.guides.filter_kpi.tip",
          },
        ],
      },
      {
        id: "vessel-report",
        path: "/reports/vessels",
        icon: Ship,
        titleKey: "app_overview.pages.vessel_report.title",
        purposeKey: "app_overview.pages.vessel_report.purpose",
        featureKeys: [
          "app_overview.pages.vessel_report.features.arrival_recap",
          "app_overview.pages.vessel_report.features.crew_stats",
          "app_overview.pages.vessel_report.features.export_excel_pdf",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "filter-kpi",
            icon: Ship,
            titleKey:
              "app_overview.pages.vessel_report.guides.filter_kpi.title",
            // TODO: verifikasi label filter & tombol ekspor dengan UI asli VesselReport.tsx
            stepKeys: [
              "app_overview.pages.vessel_report.guides.filter_kpi.steps.1",
              "app_overview.pages.vessel_report.guides.filter_kpi.steps.2",
              "app_overview.pages.vessel_report.guides.filter_kpi.steps.3",
              "app_overview.pages.vessel_report.guides.filter_kpi.steps.4",
            ],
            tipKey: "app_overview.pages.vessel_report.guides.filter_kpi.tip",
          },
        ],
      },
      {
        id: "crew-report",
        path: "/reports/crew",
        icon: Users,
        titleKey: "app_overview.pages.crew_report.title",
        purposeKey: "app_overview.pages.crew_report.purpose",
        featureKeys: [
          "app_overview.pages.crew_report.features.three_modes",
          "app_overview.pages.crew_report.features.seafarer_docs",
          "app_overview.pages.crew_report.features.export_excel_pdf",
        ],
        roles: ["administrator", "supervisor"],
        guides: [
          {
            id: "filter-kpi",
            icon: Users,
            titleKey: "app_overview.pages.crew_report.guides.filter_kpi.title",
            // TODO: verifikasi label mode tampilan, filter & tombol ekspor dengan UI asli CrewReport.tsx
            stepKeys: [
              "app_overview.pages.crew_report.guides.filter_kpi.steps.1",
              "app_overview.pages.crew_report.guides.filter_kpi.steps.2",
              "app_overview.pages.crew_report.guides.filter_kpi.steps.3",
              "app_overview.pages.crew_report.guides.filter_kpi.steps.4",
            ],
            tipKey: "app_overview.pages.crew_report.guides.filter_kpi.tip",
          },
        ],
      },
    ],
  },
  {
    id: "system-settings",
    titleKey: "app_overview.groups.system_settings.title",
    descriptionKey: "app_overview.groups.system_settings.description",
    pages: [
      {
        id: "system-users",
        path: "/settings/users",
        icon: Settings,
        titleKey: "app_overview.pages.system_users.title",
        purposeKey: "app_overview.pages.system_users.purpose",
        featureKeys: [
          "app_overview.pages.system_users.features.account_management",
          "app_overview.pages.system_users.features.role_assignment",
          "app_overview.pages.system_users.features.password_reset",
        ],
        roles: ["administrator"],
        guides: [
          {
            id: "create-account",
            icon: Users,
            titleKey:
              "app_overview.pages.system_users.guides.create_account.title",
            // TODO: verifikasi label form pembuatan akun dengan UI asli Users.tsx
            stepKeys: [
              "app_overview.pages.system_users.guides.create_account.steps.1",
              "app_overview.pages.system_users.guides.create_account.steps.2",
              "app_overview.pages.system_users.guides.create_account.steps.3",
            ],
            tipKey: "app_overview.pages.system_users.guides.create_account.tip",
          },
          {
            id: "assign-role",
            icon: Settings,
            titleKey:
              "app_overview.pages.system_users.guides.assign_role.title",
            // TODO: verifikasi label dropdown Role dengan UI asli Users.tsx
            stepKeys: [
              "app_overview.pages.system_users.guides.assign_role.steps.1",
              "app_overview.pages.system_users.guides.assign_role.steps.2",
              "app_overview.pages.system_users.guides.assign_role.steps.3",
            ],
            tipKey: "app_overview.pages.system_users.guides.assign_role.tip",
          },
          {
            id: "reset-password",
            icon: KeyRound,
            titleKey:
              "app_overview.pages.system_users.guides.reset_password.title",
            // TODO: verifikasi label aksi Reset Password dengan UI asli Users.tsx
            stepKeys: [
              "app_overview.pages.system_users.guides.reset_password.steps.1",
              "app_overview.pages.system_users.guides.reset_password.steps.2",
              "app_overview.pages.system_users.guides.reset_password.steps.3",
            ],
            tipKey: "app_overview.pages.system_users.guides.reset_password.tip",
          },
        ],
      },
      {
        id: "activity-logs",
        path: "/settings/logs",
        icon: History,
        titleKey: "app_overview.pages.activity_logs.title",
        purposeKey: "app_overview.pages.activity_logs.purpose",
        featureKeys: [
          "app_overview.pages.activity_logs.features.audit_trail",
          "app_overview.pages.activity_logs.features.actor_ip_time",
          "app_overview.pages.activity_logs.features.filter_search",
        ],
        roles: ["administrator"],
      },
      {
        id: "roles",
        path: "/settings/roles",
        icon: KeyRound,
        titleKey: "app_overview.pages.roles.title",
        purposeKey: "app_overview.pages.roles.purpose",
        featureKeys: [
          "app_overview.pages.roles.features.permission_matrix",
          "app_overview.pages.roles.features.protected_builtin",
          "app_overview.pages.roles.features.custom_roles",
        ],
        roles: ["administrator"],
        guides: [
          {
            id: "custom-roles",
            icon: KeyRound,
            titleKey: "app_overview.pages.roles.guides.custom_roles.title",
            // TODO: verifikasi label form Custom Role & Permission Matrix dengan UI asli Roles.tsx
            stepKeys: [
              "app_overview.pages.roles.guides.custom_roles.steps.1",
              "app_overview.pages.roles.guides.custom_roles.steps.2",
              "app_overview.pages.roles.guides.custom_roles.steps.3",
              "app_overview.pages.roles.guides.custom_roles.steps.4",
            ],
            tipKey: "app_overview.pages.roles.guides.custom_roles.tip",
          },
        ],
      },
      {
        id: "my-profile",
        path: "/settings/profile",
        icon: UserCircle,
        titleKey: "app_overview.pages.my_profile.title",
        purposeKey: "app_overview.pages.my_profile.purpose",
        featureKeys: [
          "app_overview.pages.my_profile.features.personal_info",
          "app_overview.pages.my_profile.features.change_password",
          "app_overview.pages.my_profile.features.role_badges",
        ],
        roles: ["administrator", "supervisor", "security"],
        guides: [
          {
            id: "change-password",
            icon: KeyRound,
            titleKey:
              "app_overview.pages.my_profile.guides.change_password.title",
            // TODO: verifikasi label form ubah kata sandi dengan UI asli Profile.tsx
            stepKeys: [
              "app_overview.pages.my_profile.guides.change_password.steps.1",
              "app_overview.pages.my_profile.guides.change_password.steps.2",
              "app_overview.pages.my_profile.guides.change_password.steps.3",
              "app_overview.pages.my_profile.guides.change_password.steps.4",
            ],
            tipKey: "app_overview.pages.my_profile.guides.change_password.tip",
          },
        ],
      },
      {
        id: "app-overview",
        path: "/settings/overview",
        icon: BookOpen,
        titleKey: "app_overview.pages.app_overview.title",
        purposeKey: "app_overview.pages.app_overview.purpose",
        featureKeys: [
          "app_overview.pages.app_overview.features.module_catalog",
          "app_overview.pages.app_overview.features.access_indicator",
          "app_overview.pages.app_overview.features.quick_search",
        ],
        roles: ["administrator", "supervisor", "security"],
      },
    ],
  },
]

export const APP_OVERVIEW_GENERAL_TIPS: OverviewGeneralTip[] = [
  {
    id: "bilingual",
    icon: Globe,
    titleKey: "app_overview.tips.bilingual.title",
    descriptionKey: "app_overview.tips.bilingual.description",
  },
  {
    id: "dark-mode",
    icon: Moon,
    titleKey: "app_overview.tips.dark_mode.title",
    descriptionKey: "app_overview.tips.dark_mode.description",
  },
  {
    id: "cloud-sync",
    icon: RefreshCw,
    titleKey: "app_overview.tips.cloud_sync.title",
    descriptionKey: "app_overview.tips.cloud_sync.description",
  },
  {
    id: "master-import-export",
    icon: FileSpreadsheet,
    titleKey: "app_overview.tips.master_import_export.title",
    descriptionKey: "app_overview.tips.master_import_export.description",
  },
]
