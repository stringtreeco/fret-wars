"use client"

import type { MarketItem } from "@/app/page"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

interface DealModalProps {
  item: MarketItem | null
  isOpen: boolean
  isInspected?: boolean
  trustTier?: "Verified" | "Mixed" | "Sketchy"
  insuranceAvailable?: boolean
  insuranceSelected?: boolean
  insuranceCost?: number
  onToggleInsurance?: () => void
  onClose: () => void
  onBuy: () => void
  onAskProof: () => void
  onWalkAway: () => void
}

export function DealModal({
  item,
  isOpen,
  isInspected = false,
  trustTier,
  insuranceAvailable = false,
  insuranceSelected = false,
  insuranceCost = 0,
  onToggleInsurance,
  onClose,
  onBuy,
  onAskProof,
  onWalkAway,
}: DealModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen || !item) return null

  const categoryColors = {
    Guitar: "text-primary",
    Amp: "text-accent",
    Pedal: "text-chart-4",
    Parts: "text-muted-foreground",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm lg:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-lg animate-in slide-in-from-bottom-4 rounded-t-xl border border-border bg-card p-6 shadow-xl lg:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-bold text-foreground"
            >
              {item.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  categoryColors[item.category]
                )}
              >
                {item.category}
              </span>
              {isInspected && (
                <span className="rounded bg-chart-4/10 px-2 py-0.5 text-[11px] font-semibold text-chart-4">
                  Proof checked
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mb-2 text-sm text-foreground">{item.description}</p>
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Condition: {item.condition}</span>
          <span>Slots: {item.slots}</span>
          <span>Rarity: {item.rarity}</span>
        </div>
        <p className="mb-4 text-sm italic text-muted-foreground">
          "{item.flavorText}"
        </p>
        {isInspected && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-primary">
            {trustTier && <span>Seller vibe: {trustTier}.</span>}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between rounded-md bg-secondary p-3">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-xl font-bold text-primary">
            ${item.priceToday.toLocaleString()}
          </span>
        </div>
        {insuranceAvailable && (
          <button
            onClick={onToggleInsurance}
            className="mb-4 flex w-full items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/80"
          >
            <span>Add Insurance</span>
            <span className="text-xs text-muted-foreground">
              {insuranceSelected ? "Added" : `+$${insuranceCost}`}
            </span>
          </button>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onBuy}
            className="flex min-h-[48px] items-center justify-center rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
          >
            Buy
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAskProof}
              disabled={isInspected}
              className="flex min-h-[44px] items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isInspected ? "Proof Checked" : "Ask for Proof"}
            </button>
            <button
              onClick={onWalkAway}
              className="flex min-h-[44px] items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-muted-foreground hover:bg-muted"
            >
              Walk Away
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
