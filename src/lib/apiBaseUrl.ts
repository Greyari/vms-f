/**
 * Base URL for every API call. On the yard server the SPA is served from Laravel's
 * public/, the same origin as the API, so "/api" is right whenever the build was not
 * given VITE_API_BASE_URL. The old fallback pointed at another host, so a build that
 * forgot the variable called a machine that does not exist on the yard LAN.
 */
export function resolveApiBaseUrl(configured: string | undefined): string {
  const value = configured?.trim()
  return value ? value : "/api"
}
