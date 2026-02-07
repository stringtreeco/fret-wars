import posthog from "posthog-js"

const PLAYER_ID_STORAGE_KEY = "fret_wars_player_id"

const POSTHOG_KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_POSTHOG_KEY : undefined
const POSTHOG_HOST =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com"
    : "https://app.posthog.com"

let didInit = false

export function analyticsEnabled() {
  return typeof window !== "undefined" && Boolean(POSTHOG_KEY)
}

export function getOrCreatePlayerId() {
  if (typeof window === "undefined") return "server"
  const existing = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY)
  if (existing) return existing
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, next)
  return next
}

export function initAnalytics() {
  if (!analyticsEnabled()) return
  if (didInit) return
  didInit = true

  const distinctId = getOrCreatePlayerId()

  posthog.init(String(POSTHOG_KEY), {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "localStorage",
    person_profiles: "never",
    sanitize_properties: (props) => {
      // Defensive: never allow emails through analytics.
      if (!props) return props
      const copy: Record<string, unknown> = { ...props }
      if ("email" in copy) delete copy.email
      if ("Email" in copy) delete copy.Email
      return copy
    },
  })

  posthog.identify(distinctId)
  posthog.register({ app: "fret-wars" })
}

export function setRunContext(context: { runSeed: string; totalDays: number }) {
  if (!analyticsEnabled()) return
  posthog.register({ runSeed: context.runSeed, totalDays: context.totalDays })
}

export function clearRunContext() {
  if (!analyticsEnabled()) return
  posthog.unregister("runSeed")
  posthog.unregister("totalDays")
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled()) return
  posthog.capture(event, properties)
}

