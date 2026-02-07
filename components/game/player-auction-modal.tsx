"use client"

import type { OwnedItem } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"

interface PlayerAuctionModalProps {
  isOpen: boolean
  item: OwnedItem | null
  baselinePrice: number
  buyerPremiumRate: number
  resolveDay: number
  onClose: () => void
  onConfirm: () => void
}

export function PlayerAuctionModal({
  isOpen,
  item,
  baselinePrice,
  buyerPremiumRate,
  resolveDay,
  onClose,
  onConfirm,
}: PlayerAuctionModalProps) {
  const formatMoney = (value: number) => `$${value.toLocaleString()}`
  const premiumPreview = useMemo(
    () => Math.round(baselinePrice * buyerPremiumRate),
    [baselinePrice, buyerPremiumRate]
  )

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fret-scrollbar max-h-[85vh] max-w-lg overflow-y-auto pr-1 border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Auction on StringTree</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs space-y-1">
            <div className="text-foreground font-semibold">{item.name}</div>
            <div>
              Condition: <span className="text-foreground">{item.condition}</span> •{" "}
              <span className="text-foreground">{item.rarity}</span>
            </div>
            <div>
              Sell-now value: <span className="text-foreground">{formatMoney(baselinePrice)}</span>
            </div>
            <div>
              Buyer fee: <span className="text-foreground">{Math.round(buyerPremiumRate * 100)}%</span>
            </div>
            <div>
              Resolves: <span className="text-foreground">Day {resolveDay}</span>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background/50 p-3 text-xs space-y-2">
            <div className="text-[11px] text-muted-foreground">
              No reserves. It sells at whatever the room pays—low or wild.
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Rough buyer fee at sell-now value:{" "}
            <span className="text-foreground">{formatMoney(premiumPreview)}</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={onConfirm}>Auction Item</Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

