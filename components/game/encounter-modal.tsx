"use client"

import type { EncounterState } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"

interface EncounterModalProps {
  encounter: EncounterState
  cash: number
  onClose: () => void
  onBulkBuy: () => void
  onTradeAccept: () => void
  onTradeDecline: () => void
  onMysteryBuy: () => void
  onMysteryProof: () => void
  onAuctionResolve: (maxBid: number) => void
  onRepairComp: () => void
  onRepairRefuse: () => void
}

export function EncounterModal({
  encounter,
  cash,
  onClose,
  onBulkBuy,
  onTradeAccept,
  onTradeDecline,
  onMysteryBuy,
  onMysteryProof,
  onAuctionResolve,
  onRepairComp,
  onRepairRefuse,
}: EncounterModalProps) {
  const [timeLeftMs, setTimeLeftMs] = useState(6000)
  const [maxBidInput, setMaxBidInput] = useState("")
  const [submittedBid, setSubmittedBid] = useState<number | null>(null)
  const didResolveRef = useRef(false)

  useEffect(() => {
    if (encounter.type !== "auction") return
    setTimeLeftMs(6000)
    setMaxBidInput("")
    setSubmittedBid(null)
    didResolveRef.current = false

    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, 6000 - elapsed)
      setTimeLeftMs(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
      }
    }, 100)

    return () => window.clearInterval(interval)
  }, [encounter])

  useEffect(() => {
    if (encounter.type !== "auction") return
    if (timeLeftMs > 0) return
    if (didResolveRef.current) return
    didResolveRef.current = true
    onAuctionResolve(submittedBid ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, encounter])

  const formatMoney = (value: number) => `$${value.toLocaleString()}`

  const parseBid = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "")
    return cleaned.length ? Number(cleaned) : 0
  }

  const clampBidToCash = (bid: number) => Math.max(0, Math.min(cash, Math.floor(bid)))

  const submitBid = () => {
    if (encounter.type !== "auction") return
    const bid = clampBidToCash(parseBid(maxBidInput))
    setSubmittedBid(bid)
    setMaxBidInput(String(bid))
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fret-scrollbar max-h-[85vh] max-w-lg overflow-y-auto pr-1 border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">
            {encounter.type === "auction" ? "StringTree Live Auction" : "New Lead"}
          </DialogTitle>
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

        {encounter.type === "auction" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Legendary lot. Proxy bidding closes when the timer hits zero.</p>
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs space-y-1">
              <div className="text-foreground font-semibold">{encounter.item.name}</div>
              <div>
                Opening bid: <span className="text-foreground">{formatMoney(encounter.startingBid)}</span>
              </div>
              <div>
                Buyer premium: <span className="text-foreground">5%</span>
              </div>
              <div>
                Rep required: <span className="text-foreground">{encounter.minReputation}+</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs">
              <span>Time left</span>
              <span className="text-foreground">{Math.ceil(timeLeftMs / 1000)}s</span>
            </div>

            {submittedBid === null ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Your max bid</div>
                  <input
                    value={maxBidInput}
                    onChange={(e) => {
                      const next = e.target.value
                      const bid = clampBidToCash(parseBid(next))
                      setMaxBidInput(next.length ? String(bid) : "")
                    }}
                    placeholder="$0"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                    inputMode="numeric"
                    disabled={timeLeftMs <= 0}
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Cash on hand: <span className="text-foreground">{formatMoney(cash)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const bid = clampBidToCash(Math.round(encounter.item.basePrice * 0.7))
                        setMaxBidInput(String(bid))
                      }}
                      disabled={timeLeftMs <= 0}
                    >
                      {formatMoney(Math.round(encounter.item.basePrice * 0.7))}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const bid = clampBidToCash(Math.round(encounter.item.basePrice * 0.95))
                        setMaxBidInput(String(bid))
                      }}
                      disabled={timeLeftMs <= 0}
                    >
                      {formatMoney(Math.round(encounter.item.basePrice * 0.95))}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const bid = clampBidToCash(Math.round(encounter.item.basePrice * 1.1))
                        setMaxBidInput(String(bid))
                      }}
                      disabled={timeLeftMs <= 0}
                    >
                      {formatMoney(Math.round(encounter.item.basePrice * 1.1))}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const bid = clampBidToCash(Math.round(encounter.item.basePrice * 1.25))
                        setMaxBidInput(String(bid))
                      }}
                      disabled={timeLeftMs <= 0}
                    >
                      {formatMoney(Math.round(encounter.item.basePrice * 1.25))}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={submitBid} disabled={timeLeftMs <= 0}>
                    Submit Max Bid
                  </Button>
                  <Button variant="ghost" onClick={onClose} disabled={timeLeftMs <= 0}>
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-border bg-secondary/20 p-3 text-xs">
                Bid submitted: <span className="text-foreground">{formatMoney(submittedBid)}</span>
                <div className="mt-1 text-muted-foreground">Proxy bidding resolves at 0s…</div>
              </div>
            )}
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
