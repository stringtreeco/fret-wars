'use client';

import type { MarketItem } from "@/app/page"
import { cn } from "@/lib/utils"

interface MarketSectionProps {
  items: MarketItem[]
  onItemSelect: (item: MarketItem) => void
  inspectedIds?: string[]
  showDeals?: boolean
  isDeal?: (item: MarketItem) => boolean
}

export function MarketSection({
  items,
  onItemSelect,
  inspectedIds = [],
  showDeals = false,
  isDeal,
}: MarketSectionProps) {
  const categoryColors = {
    Guitar: "bg-primary/10 text-primary border-primary/20",
    Amp: "bg-accent/10 text-accent border-accent/20",
    Pedal: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    Parts: "bg-muted text-muted-foreground border-muted",
  }

  const trendIcons = {
    up: "↑",
    down: "↓",
    stable: "→",
  }

  const trendColors = {
    up: "text-primary",
    down: "text-destructive",
    stable: "text-muted-foreground",
  }

  return (
    <div className="border-t border-border bg-card p-4 lg:border-t-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Market
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item)}
            className="flex items-center justify-between rounded-md border border-border bg-secondary/50 p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary active:bg-muted"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{item.name}</span>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{item.condition}</span>
                <span>{item.rarity}</span>
                <span>Slots: {item.slots}</span>
                {inspectedIds.includes(item.id) && (
                  <span className="rounded bg-chart-4/10 px-1.5 py-0.5 text-[10px] font-semibold text-chart-4">
                    Proof
                  </span>
                )}
                {showDeals && isDeal && isDeal(item) && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Deal
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "inline-flex w-fit rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  categoryColors[item.category]
                )}
              >
                {item.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                ${item.priceToday.toLocaleString()}
              </span>
              <span className={cn("text-lg", trendColors[item.trend])}>
                {trendIcons[item.trend]}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
