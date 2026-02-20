"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StringTreeLink } from "@/components/stringtree-link"

type Row = {
  id: string
  created_at: string
  display_name: string
  score: number
  total_days: number
}

async function fetchRows(path: string) {
  const res = await fetch(path, { cache: "no-store" })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok !== true) {
    const detail = data?.detail ? String(data.detail) : "Unable to load leaderboard."
    throw new Error(detail)
  }
  return (data.rows ?? []) as Row[]
}

function formatScore(value: number) {
  return `$${value.toLocaleString()}`
}

export default function LeaderboardPage() {
  const [allTime, setAllTime] = useState<Row[] | null>(null)
  const [weekly, setWeekly] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setError(null)
    fetchRows("/api/leaderboard/all-time?limit=50")
      .then((rows) => mounted && setAllTime(rows))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "Unable to load leaderboard."))
    fetchRows("/api/leaderboard/weekly?limit=50")
      .then((rows) => mounted && setWeekly(rows))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "Unable to load leaderboard."))
    return () => {
      mounted = false
    }
  }, [])

  const emptyState = useMemo(() => {
    if (error) return error
    if (!allTime || !weekly) return "Loading…"
    return null
  }, [allTime, weekly, error])

  return (
    <div className="min-h-dvh bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Top runs are limited to completed 21-day standard runs.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StringTreeLink
              source="leaderboard_header"
              variant="dark"
              className="opacity-95 hover:opacity-100"
              logoClassName="h-[18px]"
            />
            <a
              href="/"
              className="rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80"
            >
              Back
            </a>
          </div>
        </div>

        {emptyState ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          <Tabs defaultValue="weekly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">Top This Week</TabsTrigger>
              <TabsTrigger value="alltime">Top All Time</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="mt-3">
              <div className="rounded-lg border border-border bg-card p-2">
                {weekly!.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No eligible runs yet.</div>
                ) : (
                  <ol className="divide-y divide-border">
                    {weekly!.map((row, idx) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">
                            <span className="text-muted-foreground">#{idx + 1}</span>{" "}
                            <span className="font-semibold">{row.display_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()} • {row.total_days} days
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-bold text-primary">{formatScore(row.score)}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alltime" className="mt-3">
              <div className="rounded-lg border border-border bg-card p-2">
                {allTime!.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No eligible runs yet.</div>
                ) : (
                  <ol className="divide-y divide-border">
                    {allTime!.map((row, idx) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">
                            <span className="text-muted-foreground">#{idx + 1}</span>{" "}
                            <span className="font-semibold">{row.display_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()} • {row.total_days} days
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-bold text-primary">{formatScore(row.score)}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

