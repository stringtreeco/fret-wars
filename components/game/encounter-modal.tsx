"use client"

import type { EncounterState } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface EncounterModalProps {
  encounter: EncounterState
  onClose: () => void
  onBulkBuy: () => void
  onTradeAccept: () => void
  onTradeDecline: () => void
  onMysteryBuy: () => void
  onMysteryProof: () => void
  onRepairComp: () => void
  onRepairRefuse: () => void
}

export function EncounterModal({
  encounter,
  onClose,
  onBulkBuy,
  onTradeAccept,
  onTradeDecline,
  onMysteryBuy,
  onMysteryProof,
  onRepairComp,
  onRepairRefuse,
}: EncounterModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">New Lead</DialogTitle>
        </DialogHeader>

        {encounter.type === "bulkLot" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>A storage unit lot just surfaced. The details are vague but the price is right.</p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
              {encounter.vagueItems.map((item, index) => (
                <div key={index}>• {item}</div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Total cost: ${encounter.totalCost}
            </div>
            <div className="flex gap-2">
              <Button onClick={onBulkBuy}>Buy Lot</Button>
              <Button variant="ghost" onClick={onClose}>Pass</Button>
            </div>
          </div>
        )}

        {encounter.type === "tradeOffer" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>A trader proposes a swap.</p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
              You give: {encounter.requestedItem.name}
              <br />
              You get: {encounter.offeredItem.name}
            </div>
            <div className="flex gap-2">
              <Button onClick={onTradeAccept}>Accept Trade</Button>
              <Button variant="ghost" onClick={onTradeDecline}>Decline</Button>
            </div>
          </div>
        )}

        {encounter.type === "mysteriousListing" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>A too-good-to-be-true listing just appeared.</p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
              {encounter.item.name} · ${encounter.item.priceToday}
            </div>
            <div className="flex gap-2">
              <Button onClick={onMysteryBuy}>Buy Anyway</Button>
              <Button variant="ghost" onClick={onMysteryProof}>
                {encounter.proofChecked ? "Proof Checked" : "Ask for Proof"}
              </Button>
            </div>
          </div>
        )}

        {encounter.type === "repairScare" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>A buyer spots a flaw right before purchase.</p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs">
              {encounter.item.name} · Offer ${encounter.fullPrice}
              <br />
              Comp: ${encounter.discountPrice}
            </div>
            <div className="flex gap-2">
              <Button onClick={onRepairComp}>Comp & Close</Button>
              <Button variant="ghost" onClick={onRepairRefuse}>Hold Firm</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
