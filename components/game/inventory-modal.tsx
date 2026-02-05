"use client"

import type { OwnedItem } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  items: OwnedItem[]
  reputation: number
  cash: number
  tools: {
    serialScanner: boolean
    priceGuide: boolean
    insurancePlan: boolean
    luthierBench: boolean
  }
  toolCosts: {
    serialScanner: number
    priceGuide: number
    insurancePlan: number
    luthierBench: number
  }
  favorTokens: number
  getSellPrice: (item: OwnedItem) => number
  getAuthCost: (item: OwnedItem) => number
  getLuthierCost: (item: OwnedItem, target: "Player" | "Mint") => number
  onSell: (item: OwnedItem) => void
  onAuthenticate: (item: OwnedItem) => void
  onLuthier: (item: OwnedItem, target: "Player" | "Mint") => void
  onBuyTool: (toolKey: "serialScanner" | "priceGuide" | "insurancePlan" | "luthierBench") => void
  onCallFavor: () => void
  onUseFavor: () => void
}

const getHeatLabel = (heatValue: number) => {
  if (heatValue >= 70) return "High"
  if (heatValue >= 30) return "Medium"
  return "Low"
}

const getAuthLabel = (item: OwnedItem) => {
  if (item.authStatus === "pending") {
    return `Authenticating (Day ${item.authReadyDay})`
  }
  if (item.authStatus === "success") return "Authenticated"
  if (item.authStatus === "partial") return "Mixed Authentication"
  if (item.authStatus === "fail") return "Failed Authentication"
  return "Not Authenticated"
}

const getLuthierLabel = (item: OwnedItem) => {
  if (item.luthierStatus === "pending") {
    return `With Luthier (Day ${item.luthierReadyDay})`
  }
  if (item.luthierStatus === "complete") return "Luthier Complete"
  return undefined
}

const getAuthButtonLabel = (item: OwnedItem, cost: number) => {
  if (item.authStatus === "pending") return "Authenticating..."
  if (item.authStatus === "success") return "Authenticated"
  if (item.authStatus === "partial") return "Auth Mixed"
  if (item.authStatus === "fail") return "Auth Failed"
  return `Authenticate $${cost}`
}

export function InventoryModal({
  isOpen,
  onClose,
  items,
  reputation,
  cash,
  tools,
  toolCosts,
  favorTokens,
  getSellPrice,
  getAuthCost,
  getLuthierCost,
  onSell,
  onAuthenticate,
  onLuthier,
  onBuyTool,
  onCallFavor,
  onUseFavor,
}: InventoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Inventory</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tools
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              size="sm"
              variant={tools.serialScanner ? "secondary" : "outline"}
              disabled={tools.serialScanner}
              onClick={() => onBuyTool("serialScanner")}
            >
              {tools.serialScanner
                ? "Serial Scanner"
                : `Buy Serial Scanner ($${toolCosts.serialScanner})`}
            </Button>
            <Button
              size="sm"
              variant={tools.priceGuide ? "secondary" : "outline"}
              disabled={tools.priceGuide}
              onClick={() => onBuyTool("priceGuide")}
            >
              {tools.priceGuide ? "Price Guide" : `Buy Price Guide ($${toolCosts.priceGuide})`}
            </Button>
            <Button
              size="sm"
              variant={tools.insurancePlan ? "secondary" : "outline"}
              disabled={tools.insurancePlan}
              onClick={() => onBuyTool("insurancePlan")}
            >
              {tools.insurancePlan
                ? "Insurance Plan"
                : `Buy Insurance Plan ($${toolCosts.insurancePlan})`}
            </Button>
            <Button
              size="sm"
              variant={tools.luthierBench ? "secondary" : "outline"}
              disabled={tools.luthierBench}
              onClick={() => onBuyTool("luthierBench")}
            >
              {tools.luthierBench
                ? "Luthier Access"
                : `Buy Luthier Access ($${toolCosts.luthierBench})`}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Favors: {favorTokens}</span>
            <Button size="sm" variant="ghost" onClick={onCallFavor} disabled={reputation < 8}>
              Call in Favor (-8 rep)
            </Button>
            <Button size="sm" variant="ghost" onClick={onUseFavor} disabled={favorTokens <= 0}>
              Use Favor (quiet night)
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your gig bag is empty.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const sellPrice = getSellPrice(item)
              const authCost = getAuthCost(item)
              const heatLabel = getHeatLabel(item.heatValue)
              const authLabel = getAuthLabel(item)
              const luthierLabel = getLuthierLabel(item)
              return (
                <div
                  key={item.id}
                  className="rounded border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">{item.name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.category}</span>
                        <span>{item.condition}</span>
                        <span>{item.rarity}</span>
                        <span>Slots: {item.slots}</span>
                        <span>Heat: {heatLabel}</span>
                        <span>{authLabel}</span>
                        {luthierLabel && <span>{luthierLabel}</span>}
                        {item.insured && <span>Insured</span>}
                        <span>Paid ${item.purchasePrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Sell ${sellPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSell(item)}
                      disabled={item.authStatus === "pending" || item.luthierStatus === "pending"}
                      className="min-w-[96px]"
                    >
                      Sell
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAuthenticate(item)}
                      disabled={item.authStatus !== "none" || cash < authCost}
                      className={cn(
                        "min-w-[140px]",
                        item.authStatus !== "none" && "text-muted-foreground"
                      )}
                    >
                      {getAuthButtonLabel(item, authCost)}
                    </Button>
                    {tools.luthierBench && item.luthierStatus !== "pending" && (
                      <>
                        {item.condition === "Project" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onLuthier(item, "Player")}
                          >
                            Luthier: Player (${getLuthierCost(item, "Player")})
                          </Button>
                        )}
                        {item.condition === "Player" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onLuthier(item, "Mint")}
                          >
                            Luthier: Mint (${getLuthierCost(item, "Mint")})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Reputation {reputation} • Cash ${cash.toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
