import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

async function tryBeehiivOptIn(email: string) {
  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !publicationId) return { ok: false, skipped: true as const }

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      reactivate_existing: true,
      send_welcome_email: false,
      utm_source: "fret-wars",
      utm_medium: "in-game",
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, skipped: false as const, status: res.status, detail: text.slice(0, 500) }
  }

  return { ok: true, skipped: false as const }
}

const ScorePayloadSchema = z.object({
  displayName: z.string().trim().min(0).max(32).optional(),
  score: z.number().int().min(0),
  runSeed: z.string().trim().min(1).max(80).optional(),
  day: z.number().int().min(1),
  totalDays: z.number().int().min(1),
  completed: z.boolean(),
  cash: z.number().int().min(0).optional(),
  reputation: z.number().int().min(0).max(100).optional(),
  inventorySlotsUsed: z.number().int().min(0).optional(),
  inventoryCapacity: z.number().int().min(0).optional(),
  bestFlip: z
    .object({
      name: z.string().trim().min(1).max(80),
      profit: z.number().int(),
    })
    .optional(),
  rarestSold: z
    .object({
      name: z.string().trim().min(1).max(80),
      rarity: z.string().trim().min(1).max(24),
    })
    .optional(),
  email: z.string().trim().email().optional(),
  emailOptIn: z.boolean().optional(),
  clientVersion: z.string().trim().min(1).max(40).optional(),
})

function computeEligible(payload: z.infer<typeof ScorePayloadSchema>) {
  const isStandard = payload.totalDays === 21
  const isComplete = payload.completed && payload.day >= payload.totalDays
  return isStandard && isComplete
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const payload = ScorePayloadSchema.parse(body)

    const displayName = payload.displayName?.trim() ? payload.displayName.trim() : "Anonymous"
    const emailOptIn = Boolean(payload.emailOptIn) && Boolean(payload.email)
    const eligible = computeEligible(payload)

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("scores")
      .insert({
        display_name: displayName,
        score: payload.score,
        run_seed: payload.runSeed ?? null,
        day: payload.day,
        total_days: payload.totalDays,
        completed: payload.completed,
        eligible,
        cash: payload.cash ?? null,
        reputation: payload.reputation ?? null,
        inventory_slots_used: payload.inventorySlotsUsed ?? null,
        inventory_capacity: payload.inventoryCapacity ?? null,
        best_flip_name: payload.bestFlip?.name ?? null,
        best_flip_profit: payload.bestFlip?.profit ?? null,
        rarest_sold_name: payload.rarestSold?.name ?? null,
        rarest_sold_rarity: payload.rarestSold?.rarity ?? null,
        email: emailOptIn ? payload.email! : null,
        email_opt_in: emailOptIn,
        opt_in_at: emailOptIn ? new Date().toISOString() : null,
        client_version: payload.clientVersion ?? null,
      })
      .select("id, eligible")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 })
    }

    // Best-effort opt-in; never block score submission on email provider issues.
    let beehiiv: unknown = { ok: false, skipped: true }
    if (emailOptIn) {
      beehiiv = await tryBeehiivOptIn(payload.email!)
    }

    return NextResponse.json({ ok: true, id: data.id, eligible: data.eligible, beehiiv })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "invalid_payload", issues: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : "unknown_error"
    const isMissingEnv = message.includes("Missing required env var:")
    return NextResponse.json(
      { ok: false, error: isMissingEnv ? "server_not_configured" : "server_error", detail: message },
      { status: isMissingEnv ? 503 : 500 }
    )
  }
}

