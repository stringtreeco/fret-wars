"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { DuelOption } from "@/app/page"

interface DuelModalProps {
  isOpen: boolean
  challengerLabel: string
  intro: string
  options: DuelOption[]
  performanceItems: { id: string; name: string; description: string }[]
  selectedBoostId?: string
  wagerOffered: boolean
  wagerAmount: number
  wagerAccepted: boolean
  wagerLocked: boolean
  round: number
  totalRounds: number
  playerScore: number
  opponentScore: number
  lastReaction?: string
  onToggleWager: () => void
  onSelectBoost: (id: string) => void
  onChoose: (option: DuelOption, wagerAccepted: boolean) => void
  onDecline: () => void
}

export function DuelModal({
  isOpen,
  challengerLabel,
  intro,
  options,
  performanceItems,
  selectedBoostId,
  wagerOffered,
  wagerAmount,
  wagerAccepted,
  wagerLocked,
  round,
  totalRounds,
  playerScore,
  opponentScore,
  lastReaction,
  onToggleWager,
  onSelectBoost,
  onChoose,
  onDecline,
}: DuelModalProps) {
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

        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <span>Round {round} of {totalRounds}</span>
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

        {wagerOffered && (
          <button
            onClick={onToggleWager}
            disabled={wagerLocked}
            className="mt-3 flex w-full items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/80"
          >
            <span>Wager</span>
            <span className="text-xs text-muted-foreground">
              {wagerAccepted ? `Accepted $${wagerAmount}` : `Offer $${wagerAmount}`}
            </span>
          </button>
        )}

        <div className="mt-4 grid gap-2">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="secondary"
              className="justify-between"
              onClick={() => onChoose(option, wagerAccepted)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Button variant="ghost" onClick={onDecline} className="w-full text-muted-foreground">
          Decline
        </Button>
      </DialogContent>
    </Dialog>
  )
}
