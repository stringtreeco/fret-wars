import type { GameState } from "@/app/page"
import { cn } from "@/lib/utils"

interface StatusBarProps {
  gameState: GameState
  className?: string
}

export function StatusBar({ gameState, className }: StatusBarProps) {
  const heatColors = {
    Low: "bg-primary/20 text-primary",
    Medium: "bg-accent/20 text-accent",
    High: "bg-destructive/20 text-destructive",
  }
  const bagLabel =
    gameState.bagTier === 2 ? "Flight Case" : gameState.bagTier === 1 ? "Hard Case" : "Gig Bag"
  const debt = gameState.creditLine?.loan?.balanceDue ?? 0
  const totalHeat = gameState.inventory.reduce((sum, item) => sum + item.heatValue, 0)
  const showPaperTrailNA = totalHeat <= 0

  return (
    <div className={cn("bg-card", className)}>
      {/* Mobile: compact summary row with expandable details */}
      <div className="lg:hidden">
        <details className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 select-none [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 text-xs text-muted-foreground">
              <span>Day </span>
              <span className="font-medium text-foreground tabular-nums">
                {gameState.day}/{gameState.totalDays}
              </span>
              <span className="mx-1">•</span>
              <span className="font-medium text-foreground truncate">
                {gameState.location}
              </span>
            </div>
            <div className="shrink-0 text-sm font-semibold text-primary tabular-nums">
              ${gameState.cash.toLocaleString()}
            </div>
          </summary>
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Debt</span>
                <span className={cn("font-medium", debt > 0 ? "text-foreground" : "text-muted-foreground")}>
                  ${Math.round(debt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{bagLabel}</span>
                <span className="font-medium text-foreground">
                  {gameState.inventory.reduce((sum, item) => sum + item.slots, 0)}/
                  {gameState.inventoryCapacity}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rep</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${gameState.reputation}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium text-foreground">
                    {gameState.reputation}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paper Trail</span>
                {showPaperTrailNA ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    N/A
                  </span>
                ) : (
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      heatColors[gameState.heatLevel]
                    )}
                  >
                    {gameState.heatLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Desktop: full stats */}
      <div className="hidden p-4 lg:block">
        <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1 lg:gap-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Day</span>
            <span className="font-medium text-foreground">
              {gameState.day}/{gameState.totalDays}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="truncate pl-2 font-medium text-foreground">
              {gameState.location}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cash</span>
            <span className="font-medium text-primary">
              ${gameState.cash.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Debt</span>
            <span className={cn("font-medium", debt > 0 ? "text-foreground" : "text-muted-foreground")}>
              ${Math.round(debt).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{bagLabel}</span>
            <span className="font-medium text-foreground">
              {gameState.inventory.reduce((sum, item) => sum + item.slots, 0)}/
              {gameState.inventoryCapacity}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rep</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${gameState.reputation}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-foreground">
                {gameState.reputation}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Paper Trail</span>
            {showPaperTrailNA ? (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                N/A
              </span>
            ) : (
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  heatColors[gameState.heatLevel]
                )}
              >
                {gameState.heatLevel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
