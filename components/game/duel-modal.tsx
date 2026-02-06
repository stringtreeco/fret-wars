"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { DuelOption } from "@/app/page"
import { useEffect, useMemo, useRef, useState } from "react"

interface DuelModalProps {
  isOpen: boolean
  challengerLabel: string
  intro: string
  options: DuelOption[]
  performanceItems: { id: string; name: string; description: string }[]
  selectedBoostId?: string
  wagerAmount: number
  round: number
  totalRounds: number
  playerScore: number
  opponentScore: number
  lastReaction?: string
  onSelectBoost: (id: string) => void
  onChoose: (option: DuelOption, accuracy: number) => void
  onDecline: () => void
}

export function DuelModal({
  isOpen,
  challengerLabel,
  intro,
  options,
  performanceItems,
  selectedBoostId,
  wagerAmount,
  round,
  totalRounds,
  playerScore,
  opponentScore,
  lastReaction,
  onSelectBoost,
  onChoose,
  onDecline,
}: DuelModalProps) {
  const [phase, setPhase] = useState<"pick" | "meter">("pick")
  const [pendingOption, setPendingOption] = useState<DuelOption | null>(null)

  const trackRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const posRef = useRef(0.2)
  const dirRef = useRef<1 | -1>(1)
  const targetCenterRef = useRef(0.5)
  const targetWidthRef = useRef(0.18)

  const difficulty = useMemo(() => Math.max(0, totalRounds - 1), [totalRounds])
  const speedPerSecond = useMemo(() => {
    // Fraction of the bar per second. Higher rounds/duels move faster.
    return 0.85 + difficulty * 0.2 + (round - 1) * 0.15
  }, [difficulty, round])

  const stopMeter = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  useEffect(() => {
    // Cleanup on unmount / modal close.
    if (!isOpen) {
      stopMeter()
      setPhase("pick")
      setPendingOption(null)
    }
    return () => {
      stopMeter()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const startMeter = (option: DuelOption) => {
    stopMeter()
    setPendingOption(option)
    setPhase("meter")

    // Randomize target + start position each round.
    const targetWidth = Math.max(0.1, 0.18 - difficulty * 0.02 - (round - 1) * 0.015)
    const targetCenter = 0.15 + Math.random() * 0.7
    targetCenterRef.current = targetCenter
    targetWidthRef.current = targetWidth

    posRef.current = Math.random()
    dirRef.current = Math.random() < 0.5 ? 1 : -1

    const dot = dotRef.current
    if (dot) dot.style.left = `${posRef.current * 100}%`

    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      let next = posRef.current + dirRef.current * speedPerSecond * dt
      if (next >= 1) {
        next = 1
        dirRef.current = -1
      } else if (next <= 0) {
        next = 0
        dirRef.current = 1
      }
      posRef.current = next

      if (dotRef.current) {
        dotRef.current.style.left = `${next * 100}%`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const computeAccuracy = () => {
    const pos = posRef.current
    const center = targetCenterRef.current
    const width = targetWidthRef.current
    const dist = Math.abs(pos - center)
    const half = width / 2

    // Base falloff across half the bar.
    const base = Math.max(0, 1 - dist / 0.5)
    // Small sweet-zone boost for "feels good" hits.
    const sweet = dist <= half ? 0.15 : 0
    return Math.max(0, Math.min(1, base + sweet))
  }

  const handleHit = () => {
    const option = pendingOption
    if (!option) return
    stopMeter()

    const accuracy = computeAccuracy()
    setPhase("pick")
    setPendingOption(null)
    onChoose(option, accuracy)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onDecline}>
      <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Jam Challenge</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="text-foreground">{challengerLabel}</p>
          <p>{intro}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <span>Round {round} of {totalRounds}</span>
          <span>Wager ${wagerAmount}</span>
          <span>Score {Math.round(playerScore)} - {Math.round(opponentScore)}</span>
        </div>
        {lastReaction && (
          <p className="text-xs text-primary">{lastReaction}</p>
        )}

        {performanceItems.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-secondary/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Performance Item
            </p>
            <div className="mt-2 grid gap-2">
              {performanceItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectBoost(item.id)}
                  disabled={phase === "meter"}
                  className={`flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedBoostId === item.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary text-foreground hover:border-primary/60"
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "meter" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Timing
              </p>
              <p className="mt-1 text-sm text-foreground">
                Tap <span className="font-semibold">HIT</span> when the dot lands in the zone.
              </p>
              <div
                ref={trackRef}
                onClick={handleHit}
                className="relative mt-3 h-10 w-full cursor-pointer rounded-md border border-border bg-background"
              >
                <div
                  className="absolute top-0 h-full rounded-md bg-primary/20"
                  style={{
                    left: `${(targetCenterRef.current - targetWidthRef.current / 2) * 100}%`,
                    width: `${targetWidthRef.current * 100}%`,
                  }}
                />
                <div
                  ref={dotRef}
                  className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded bg-primary shadow"
                  style={{ left: `${posRef.current * 100}%`, transform: "translate(-50%, -50%)" }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => startMeter(pendingOption ?? options[0])}>
                  Restart
                </Button>
                <Button onClick={handleHit}>HIT</Button>
              </div>
              {pendingOption && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Style locked: <span className="text-foreground">{pendingOption.label}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {options.map((option) => (
              <Button
                key={option.id}
                variant="secondary"
                className="justify-between"
                onClick={() => startMeter(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={onDecline} className="w-full text-muted-foreground">
          Decline
        </Button>
      </DialogContent>
    </Dialog>
  )
}
