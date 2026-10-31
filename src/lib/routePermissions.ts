/**
 * The permission each screen needs, shared by the sidebar (AppLayout) and the route guards
 * (App.tsx) so the two cannot drift apart (hybrid decision FE-2). `null` means any signed-in
 * user. The dashboard ("/") is deliberately absent: it is where a refused user is sent, so
 * guarding it would loop.
 */
export const ROUTE_PERMISSIONS = {
  "/visits/create": "create_visits",
  "/visits/history": "view_visits",
  "/visits/print": "view_visits",
  "/visits/:id/print": "view_visits",
  "/vessel-arrivals": "view_vessel_arrivals",
  "/master/locations": "view_locations",
  "/master/staffs": "view_staffs",
  "/master/cards": "view_cards",
  "/master/vehicle-cards": "view_cards",
  "/master/visitors": "view_visitors",
  "/master/visitors/blacklist": ["view_visitors", "manage_blacklist"],
  "/reports/visits": "view_reports",
  "/visits/report": "view_reports",
  "/reports/vessels": "view_reports",
  "/reports/crew": "view_reports",
  "/settings/users": "view_users",
  "/settings/logs": "view_logs",
  "/settings/roles": "view_roles",
  "/settings/profile": null,
  "/settings/overview": null,
} as const satisfies Record<string, string | readonly string[] | null>

export type GuardedPath = keyof typeof ROUTE_PERMISSIONS

export type RoutePermissionRequirement = string | readonly string[] | null | undefined

/** The permission a path needs, or undefined when any signed-in user may open it. */
export function permissionFor(path: GuardedPath): string | readonly string[] | undefined {
  return ROUTE_PERMISSIONS[path] ?? undefined
}

/** Check if user permissions satisfy the route requirement */
export function canAccessPath(
  path: GuardedPath,
  hasPermission: (perm: string) => boolean
): boolean {
  const perm = permissionFor(path)
  if (perm === undefined || perm === null) return true
  if (typeof perm === "string") {
    return hasPermission(perm)
  }
  return perm.some((p) => hasPermission(p))
}
