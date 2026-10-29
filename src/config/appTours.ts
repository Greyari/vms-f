import type { OverviewPagePath, OverviewRoleKey } from "@/config/appOverview"

export type TourSide = "top" | "right" | "bottom" | "left" | "over"

export interface TourStep {
  id: string
  targetSelector: string
  titleKey: string
  descriptionKey: string
  side?: TourSide
  path?: OverviewPagePath
  requiredPermission?: string
}

export interface TourConfig {
  id: string
  titleKey: string
  steps: TourStep[]
  roles: OverviewRoleKey[]
}

export const APP_TOURS: TourConfig[] = [
  {
    id: "tour-welcome",
    titleKey: "app_overview.tour.tour_welcome.title",
    roles: ["administrator", "supervisor", "security"],
    steps: [
      {
        id: "welcome-sidebar",
        targetSelector: '[data-tour="layout-sidebar"]',
        titleKey: "app_overview.tour.tour_welcome.steps.1.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.1.description",
        side: "right",
      },
      {
        id: "welcome-search",
        targetSelector: '[data-tour="overview-search"]',
        titleKey: "app_overview.tour.tour_welcome.steps.2.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.2.description",
        side: "bottom",
        path: "/settings/overview",
      },
      {
        id: "welcome-jump-nav",
        targetSelector: '[data-tour="overview-jump-nav"]',
        titleKey: "app_overview.tour.tour_welcome.steps.3.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.3.description",
        side: "bottom",
        path: "/settings/overview",
      },
      {
        id: "welcome-add-visit-card",
        targetSelector: '[data-tour="overview-card-add-visit"]',
        titleKey: "app_overview.tour.tour_welcome.steps.4.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.4.description",
        side: "top",
        path: "/settings/overview",
        requiredPermission: "create_visits",
      },
      {
        id: "welcome-language",
        targetSelector: '[data-tour="layout-language"]',
        titleKey: "app_overview.tour.tour_welcome.steps.5.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.5.description",
        side: "bottom",
      },
      {
        id: "welcome-theme",
        targetSelector: '[data-tour="layout-theme"]',
        titleKey: "app_overview.tour.tour_welcome.steps.6.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.6.description",
        side: "bottom",
      },
      {
        id: "welcome-profile",
        targetSelector: '[data-tour="layout-profile"]',
        titleKey: "app_overview.tour.tour_welcome.steps.7.title",
        descriptionKey: "app_overview.tour.tour_welcome.steps.7.description",
        side: "right",
      },
    ],
  },
  {
    id: "tour-visit-flow",
    titleKey: "app_overview.tour.tour_visit_flow.title",
    roles: ["administrator", "supervisor", "security"],
    steps: [
      {
        id: "visit-flow-card",
        targetSelector: '[data-tour="overview-card-add-visit"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.1.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.1.description",
        side: "top",
        path: "/settings/overview",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-name-search",
        targetSelector: '[data-tour="visit-name-search"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.2.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.2.description",
        side: "bottom",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-id-detection",
        targetSelector: '[data-tour="visit-id-lookup"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.3.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.3.description",
        side: "right",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-security-alert",
        targetSelector: '[data-tour="visit-status-panel"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.4.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.4.description",
        side: "left",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-destination-host",
        targetSelector: '[data-tour="visit-destination-host"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.5.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.5.description",
        side: "top",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-cards-vehicle",
        targetSelector: '[data-tour="visit-cards-section"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.6.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.6.description",
        side: "top",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-print-pass",
        targetSelector: '[data-tour="visit-submit-bar"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.7.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.7.description",
        side: "top",
        path: "/visits/create",
        requiredPermission: "create_visits",
      },
      {
        id: "visit-flow-checkout",
        targetSelector: '[data-tour="history-table-card"]',
        titleKey: "app_overview.tour.tour_visit_flow.steps.8.title",
        descriptionKey: "app_overview.tour.tour_visit_flow.steps.8.description",
        side: "top",
        path: "/visits/history",
        requiredPermission: "checkout_visits",
      },
    ],
  },
  {
    id: "tour-vessel-flow",
    titleKey: "app_overview.tour.tour_vessel_flow.title",
    roles: ["administrator", "supervisor"],
    steps: [
      {
        id: "vessel-flow-prereq-vessel",
        targetSelector: '[data-tour="master-header-actions"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.1.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.1.description",
        side: "bottom",
        path: "/master/locations",
        requiredPermission: "view_locations",
      },
      {
        id: "vessel-flow-prereq-crew",
        targetSelector: '[data-tour="master-visitors-actions"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.2.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.2.description",
        side: "bottom",
        path: "/master/visitors",
        requiredPermission: "view_visitors",
      },
      {
        id: "vessel-flow-register-btn",
        targetSelector: '[data-tour="vessel-create-btn"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.3.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.3.description",
        side: "bottom",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-select-vessel",
        targetSelector: '[data-tour="vessel-form-select-vessel"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.4.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.4.description",
        side: "bottom",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-manage-crew-btn",
        targetSelector: '[data-tour="vessel-form-manage-crew-btn"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.5.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.5.description",
        side: "bottom",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-crew-select-dialog",
        targetSelector: '[data-tour="vessel-crew-dialog-list"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.6.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.6.description",
        side: "top",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-apply-crew-btn",
        targetSelector: '[data-tour="vessel-crew-dialog-apply-btn"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.7.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.7.description",
        side: "top",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-save-arrival-btn",
        targetSelector: '[data-tour="vessel-form-submit-btn"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.8.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.8.description",
        side: "top",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-quick-search",
        targetSelector: '[data-tour="vessel-unified-search"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.9.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.9.description",
        side: "bottom",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-open-modal",
        targetSelector: '[data-tour="vessel-open-detail-btn"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.10.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.10.description",
        side: "left",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-manifest-modal",
        targetSelector: '[data-tour="vessel-detail-modal-dialog"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.11.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.11.description",
        side: "top",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
      {
        id: "vessel-flow-checkout-vessel",
        targetSelector: '[data-tour="vessel-filter-bar"]',
        titleKey: "app_overview.tour.tour_vessel_flow.steps.12.title",
        descriptionKey:
          "app_overview.tour.tour_vessel_flow.steps.12.description",
        side: "bottom",
        path: "/vessel-arrivals",
        requiredPermission: "view_vessel_arrivals",
      },
    ],
  },
  {
    id: "tour-master-data",
    titleKey: "app_overview.tour.tour_master_data.title",
    roles: ["administrator", "supervisor"],
    steps: [
      {
        id: "master-data-locations",
        targetSelector: '[data-tour="master-header-actions"]',
        titleKey: "app_overview.tour.tour_master_data.steps.1.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.1.description",
        side: "bottom",
        path: "/master/locations",
        requiredPermission: "view_locations",
      },
      {
        id: "master-data-staffs",
        targetSelector: '[data-tour="master-staffs-header"]',
        titleKey: "app_overview.tour.tour_master_data.steps.2.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.2.description",
        side: "bottom",
        path: "/master/staffs",
        requiredPermission: "view_staffs",
      },
      {
        id: "master-data-cards",
        targetSelector: '[data-tour="master-cards-header"]',
        titleKey: "app_overview.tour.tour_master_data.steps.3.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.3.description",
        side: "bottom",
        path: "/master/cards",
        requiredPermission: "view_cards",
      },
      {
        id: "master-data-vehicle-cards",
        targetSelector: '[data-tour="master-vehicle-cards-header"]',
        titleKey: "app_overview.tour.tour_master_data.steps.4.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.4.description",
        side: "bottom",
        path: "/master/vehicle-cards",
        requiredPermission: "view_cards",
      },
      {
        id: "master-data-visitors",
        targetSelector: '[data-tour="master-visitors-actions"]',
        titleKey: "app_overview.tour.tour_master_data.steps.5.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.5.description",
        side: "bottom",
        path: "/master/visitors",
        requiredPermission: "view_visitors",
      },
      {
        id: "master-data-blacklist",
        targetSelector: '[data-tour="master-blacklist-actions"]',
        titleKey: "app_overview.tour.tour_master_data.steps.6.title",
        descriptionKey:
          "app_overview.tour.tour_master_data.steps.6.description",
        side: "bottom",
        path: "/master/visitors/blacklist",
        requiredPermission: "view_visitors",
      },
    ],
  },
]
