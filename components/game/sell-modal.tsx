"use client"

import type { OwnedItem } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SellModalProps {
  isOpen: boolean
  onClose: () => void
  day: number
  items: OwnedItem[]
  getSellPrice: (item: OwnedItem) => number
  onSell: (item: OwnedItem) => void
  onRepairScare?: (item: OwnedItem, fullPrice: number, discountPrice: number) => void
}

export function SellModal({ isOpen, onClose, day, items, getSellPrice, onSell, onRepairScare }: SellModalProps) {
  const saleableItems = items.filter(
    (item) =>
      item.authStatus !== "pending" &&
      item.luthierStatus !== "pending" &&
      // Can't flip the same day you bought it.
      (item.acquiredDay < day || Boolean(item.sameDaySellOk))
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fret-scrollbar max-h-[85vh] max-w-lg overflow-y-auto pr-1 border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Sell Gear</DialogTitle>
        </DialogHeader>

        {saleableItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing saleable right now. Gear bought today (except flash listings), in authentication, or at the luthier can’t be sold yet.
          </p>
        ) : (
          <div className="space-y-3">
            {saleableItems.map((item) => {
              const price = getSellPrice(item)
              const delta = price - item.purchasePrice
              const deltaLabel = delta >= 0 ? `+${delta}` : `${delta}`
              const scareChance =
                item.authStatus === "success" || item.condition === "Mint" ? 0.06 : 0.18
              return (
                <div
                  key={item.id}
                  className="rounded border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.category} · {item.condition} · {item.rarity}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      ${price.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {delta >= 0 ? "Gain" : "Loss"} ${Math.abs(delta).toLocaleString()} ({deltaLabel})
                  </div>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      if (onRepairScare && Math.random() < scareChance) {
                        const discount = Math.max(25, Math.round(price * 0.85))
                        onRepairScare(item, price, discount)
                      } else {
                        onSell(item)
                      }
                    }}
                  >
                    Sell
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
