'use client';

import { cn } from "@/lib/utils"

interface ActionBarProps {
  onAction: (action: string) => void
  className?: string
}

const actions = [
  { id: "travel", label: "Travel", accent: false },
  { id: "gigbag", label: "Gig Bag", accent: false },
  { id: "sell", label: "Sell", accent: false },
  { id: "endday", label: "End Day", accent: true },
]

export function ActionBar({ onAction, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 grid grid-cols-4 gap-2 bg-card p-3 lg:gap-2 lg:p-4",
        className
      )}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className={cn(
            "flex min-h-[48px] items-center justify-center rounded-md border px-2 py-2.5 text-sm font-medium transition-colors active:scale-95 lg:text-base",
            action.accent
              ? "border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground"
              : "border-border bg-secondary text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
