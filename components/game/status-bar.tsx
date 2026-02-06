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

  return (
    <div className={cn("bg-card p-4", className)}>
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
          <span className="text-muted-foreground">Provenance</span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              heatColors[gameState.heatLevel]
            )}
          >
            {gameState.heatLevel}
          </span>
        </div>
      </div>
    </div>
  )
}
