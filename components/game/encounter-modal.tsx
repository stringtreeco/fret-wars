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
  const [maxBidInput, setMaxBidInput] = useState("")
  const [auctionPhase, setAuctionPhase] = useState<"entry" | "resolving">("entry")
  const [lockedBid, setLockedBid] = useState<number | null>(null)
  const [liveBid, setLiveBid] = useState<number | null>(null)
  const auctionIntervalRef = useRef<number | null>(null)
  const auctionTimeoutRef = useRef<number | null>(null)

  const formatMoney = (value: number) => `$${value.toLocaleString()}`

  const parseBid = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "")
    return cleaned.length ? Number(cleaned) : 0
  }

  const clampBidToCash = (bid: number) => Math.max(0, Math.min(cash, Math.floor(bid)))

  const getAuctionIncrementForDisplay = (basePrice: number) => {
    if (basePrice < 2000) return 25
    if (basePrice < 5000) return 50
    if (basePrice < 10000) return 100
    return 250
  }

  useEffect(() => {
    // Reset local UI state when the encounter changes.
    setMaxBidInput("")
    setAuctionPhase("entry")
    setLockedBid(null)
    setLiveBid(null)
    if (auctionIntervalRef.current) {
      window.clearInterval(auctionIntervalRef.current)
      auctionIntervalRef.current = null
    }
    if (auctionTimeoutRef.current) {
      window.clearTimeout(auctionTimeoutRef.current)
      auctionTimeoutRef.current = null
    }
  }, [encounter])

  useEffect(() => {
    return () => {
      if (auctionIntervalRef.current) window.clearInterval(auctionIntervalRef.current)
      if (auctionTimeoutRef.current) window.clearTimeout(auctionTimeoutRef.current)
    }
  }, [])

  const placeMaxBid = () => {
    if (encounter.type !== "auction") return
    const bid = clampBidToCash(parseBid(maxBidInput))
    setMaxBidInput(String(bid))

    // If the bid isn't valid, resolve immediately (no animation needed).
    if (bid < encounter.startingBid) {
      onAuctionResolve(bid)
      return
    }

    setLockedBid(bid)
    setAuctionPhase("resolving")
    setLiveBid(encounter.startingBid)

    const increment = getAuctionIncrementForDisplay(encounter.item.basePrice)
    const steps = 9 + Math.floor(Math.random() * 4) // 9–12 ticks
    const maxDisplay = Math.max(encounter.startingBid, bid + increment * 3)
    let ticks = 0

    if (auctionIntervalRef.current) {
      window.clearInterval(auctionIntervalRef.current)
      auctionIntervalRef.current = null
    }
    if (auctionTimeoutRef.current) {
      window.clearTimeout(auctionTimeoutRef.current)
      auctionTimeoutRef.current = null
    }

    auctionIntervalRef.current = window.setInterval(() => {
      ticks += 1
      setLiveBid((prev) => {
        const current = prev ?? encounter.startingBid
        const bump = increment * (1 + Math.floor(Math.random() * 3)) // 1–3 increments
        const next = Math.min(maxDisplay, current + bump)
        return next
      })
      if (ticks >= steps) {
        if (auctionIntervalRef.current) {
          window.clearInterval(auctionIntervalRef.current)
          auctionIntervalRef.current = null
        }
        auctionTimeoutRef.current = window.setTimeout(() => {
          onAuctionResolve(bid)
        }, 250)
      }
    }, 140)
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
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
            <p>
              {auctionPhase === "resolving"
                ? "Max bid locked. Proxy bidding is in motion…"
                : "Legendary lot. Enter your max bid and proxy bidding resolves instantly."}
            </p>
            {auctionPhase === "entry" && (
              <div className="text-[11px] text-muted-foreground">
                Any bid $1+ is accepted. You’ll only win if your max meets the opening bid.
              </div>
            )}
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

            {auctionPhase === "entry" ? (
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
                  >
                    {formatMoney(Math.round(encounter.item.basePrice * 0.7))}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const bid = clampBidToCash(Math.round(encounter.item.basePrice * 0.95))
                      setMaxBidInput(String(bid))
                    }}
                  >
                    {formatMoney(Math.round(encounter.item.basePrice * 0.95))}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const bid = clampBidToCash(Math.round(encounter.item.basePrice * 1.1))
                      setMaxBidInput(String(bid))
                    }}
                  >
                    {formatMoney(Math.round(encounter.item.basePrice * 1.1))}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const bid = clampBidToCash(Math.round(encounter.item.basePrice * 1.25))
                      setMaxBidInput(String(bid))
                    }}
                  >
                    {formatMoney(Math.round(encounter.item.basePrice * 1.25))}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-background/50 p-3">
                <div className="text-[11px] text-muted-foreground">Your max bid locked</div>
                <div className="text-base font-semibold text-foreground">
                  {lockedBid === null ? "—" : formatMoney(lockedBid)}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">Live bidding</div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {liveBid === null ? formatMoney(encounter.startingBid) : formatMoney(liveBid)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={placeMaxBid} disabled={auctionPhase === "resolving"}>
                {auctionPhase === "resolving" ? "Bidding…" : "Place Max Bid"}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={auctionPhase === "resolving"}>
                Skip
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
