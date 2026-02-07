import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get("limit")
    const limit = Math.max(
      1,
      Math.min(MAX_LIMIT, Number(limitParam ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
    )

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("scores")
      .select(
        "id, created_at, display_name, score, day, total_days, cash, reputation, inventory_slots_used, inventory_capacity, best_flip_name, best_flip_profit, rarest_sold_name, rarest_sold_rarity"
      )
      .eq("eligible", true)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, rows: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error"
    const isMissingEnv = message.includes("Missing required env var:")
    return NextResponse.json(
      { ok: false, error: isMissingEnv ? "server_not_configured" : "server_error", detail: message },
      { status: isMissingEnv ? 503 : 500 }
    )
  }
}

