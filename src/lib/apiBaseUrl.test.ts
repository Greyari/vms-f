import { describe, expect, it } from "vitest"
import { resolveApiBaseUrl } from "./apiBaseUrl"

describe("resolveApiBaseUrl", () => {
  it("uses the base URL the build was given", () => {
    expect(resolveApiBaseUrl("http://127.0.0.1:8003/api")).toBe(
      "http://127.0.0.1:8003/api"
    )
  })

  it("falls back to the same-origin /api when the build was given nothing", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("/api")
    expect(resolveApiBaseUrl("")).toBe("/api")
    expect(resolveApiBaseUrl("   ")).toBe("/api")
  })
})
