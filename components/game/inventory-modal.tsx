"use client"

import type { OwnedItem } from "@/app/page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  items: OwnedItem[]
  day: number
  reputation: number
  cash: number
  bagTier: 0 | 1 | 2
  bagLabel: string
  onUpgradeCase: () => void
  creditLine: {
    frozen: boolean
    loan: null | {
      principal: number
      balanceDue: number
      interestRate: number
      dueDay: number
      defaulted: boolean
    }
  }
  creditLimit: number
  creditInterestRate: number
  creditTermDays: number
  onCreditDraw: (amount: number) => void
  onCreditRepay: (amount: number) => void
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
  performanceMarket: { id: string; name: string; description: string; cost: number }[]
  performanceItems: { id: string; name: string }[]
  getSellPrice: (item: OwnedItem) => number
  getAuthCost: (item: OwnedItem) => number
  getLuthierCost: (item: OwnedItem, target: "Player" | "Mint") => number
  onSell: (item: OwnedItem) => void
  onAuthenticate: (item: OwnedItem) => void
  onLuthier: (item: OwnedItem, target: "Player" | "Mint") => void
  onListAuction: (item: OwnedItem) => void
  onBuyTool: (toolKey: "serialScanner" | "priceGuide" | "insurancePlan" | "luthierBench") => void
  onBuyPerformanceItem: (item: { id: string; name: string; description: string; cost: number }) => void
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
  day,
  reputation,
  cash,
  bagTier,
  bagLabel,
  onUpgradeCase,
  creditLine,
  creditLimit,
  creditInterestRate,
  creditTermDays,
  onCreditDraw,
  onCreditRepay,
  tools,
  toolCosts,
  performanceMarket,
  performanceItems,
  getSellPrice,
  getAuthCost,
  getLuthierCost,
  onSell,
  onAuthenticate,
  onLuthier,
  onListAuction,
  onBuyTool,
  onBuyPerformanceItem,
}: InventoryModalProps) {
  const safeCreditLine = creditLine ?? { frozen: false, loan: null }
  const safeBagTier = (bagTier ?? 0) as 0 | 1 | 2
  const safeBagLabel = bagLabel ?? (safeBagTier === 2 ? "Flight Case" : safeBagTier === 1 ? "Hard Case" : "Gig Bag")
  const slotsUsed = useMemo(() => items.reduce((sum, item) => sum + item.slots, 0), [items])
  const capacity = safeBagTier === 2 ? 21 : safeBagTier === 1 ? 16 : 11
  const [drawInput, setDrawInput] = useState("")
  const [repayInput, setRepayInput] = useState("")

  const formatMoney = (value: number) => `$${value.toLocaleString()}`
  const parseMoney = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "")
    return cleaned.length ? Number(cleaned) : 0
  }

  const drawAmount = useMemo(() => {
    const raw = parseMoney(drawInput)
    return Math.max(0, Math.min(creditLimit, Math.floor(raw)))
  }, [drawInput, creditLimit])

  const repayAmount = useMemo(() => {
    const raw = parseMoney(repayInput)
    const balance = safeCreditLine.loan?.balanceDue ?? 0
    return Math.max(0, Math.min(cash, balance, Math.floor(raw)))
  }, [repayInput, cash, safeCreditLine.loan])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">Inventory</DialogTitle>
        </DialogHeader>

        <div className="fret-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
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
          <div className="mt-2 text-xs text-muted-foreground">
            Serial Scanner cuts repo/scam risk. Price Guide flags deals. Insurance covers losses. Luthier upgrades condition (higher resale value).
          </div>
          {/* Favor system removed (Option C). */}
        </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cases
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Current: <span className="text-foreground font-medium">{safeBagLabel}</span>
              </span>
              <span>
                Capacity: <span className="text-foreground">{slotsUsed}</span>/
                <span className="text-foreground">{capacity}</span>
              </span>
            </div>
            {safeBagTier >= 2 ? (
              <p className="mt-2 text-xs text-muted-foreground">Max tier reached.</p>
            ) : (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Next:{" "}
                    <span className="text-foreground font-medium">
                      {safeBagTier === 0 ? "Hard Case" : "Flight Case"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      ({safeBagTier === 0 ? "+5 slots" : "+5 slots"})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {safeBagTier === 0 ? "$2,500 · Rep 45+" : "$7,500 · Rep 70+"}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={onUpgradeCase} className="mt-2">
                  Upgrade
                </Button>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  More capacity, slightly higher break-in risk in sketchy areas.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dealer Credit Line
            </p>
            {creditLimit <= 0 ? (
              <p className="text-xs text-muted-foreground">
                Bank says: build your rep. Credit opens at Rep 30+.
              </p>
            ) : safeCreditLine.frozen ? (
              <p className="text-xs text-muted-foreground">
                Credit is frozen for the rest of this run.
              </p>
            ) : safeCreditLine.loan ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground font-medium">
                    Balance {formatMoney(safeCreditLine.loan.balanceDue)}
                  </span>
                  <span>
                    Due Day {safeCreditLine.loan.dueDay} • {Math.round(safeCreditLine.loan.interestRate * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onCreditRepay(Math.min(cash, Math.round(safeCreditLine.loan!.balanceDue * 0.25)))}
                    disabled={cash <= 0}
                  >
                    Pay 25%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onCreditRepay(Math.min(cash, Math.round(safeCreditLine.loan!.balanceDue * 0.5)))}
                    disabled={cash <= 0}
                  >
                    Pay 50%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreditRepay(safeCreditLine.loan!.balanceDue)}
                    disabled={cash <= 0}
                    className="col-span-2"
                  >
                    Pay Full
                  </Button>
                </div>
                <div className="grid gap-2">
                  <input
                    value={repayInput}
                    onChange={(e) => setRepayInput(e.target.value)}
                    placeholder="Custom payment"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                    inputMode="numeric"
                  />
                  <Button
                    size="sm"
                    onClick={() => onCreditRepay(repayAmount)}
                    disabled={repayAmount <= 0}
                  >
                    Pay {formatMoney(repayAmount)}
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Cash on hand: <span className="text-foreground">{formatMoney(cash)}</span> • Today: Day {day}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Limit <span className="text-foreground font-medium">{formatMoney(creditLimit)}</span>
                  </span>
                  <span>
                    {Math.round(creditInterestRate * 100)}% • due in {creditTermDays} days
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onCreditDraw(Math.round(creditLimit * 0.25))}>
                    Draw 25%
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onCreditDraw(Math.round(creditLimit * 0.5))}>
                    Draw 50%
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCreditDraw(creditLimit)} className="col-span-2">
                    Draw {formatMoney(creditLimit)}
                  </Button>
                </div>
                <div className="grid gap-2">
                  <input
                    value={drawInput}
                    onChange={(e) => setDrawInput(e.target.value)}
                    placeholder="Custom draw"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                    inputMode="numeric"
                  />
                  <Button size="sm" onClick={() => onCreditDraw(drawAmount)} disabled={drawAmount <= 0}>
                    Draw {formatMoney(drawAmount)}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Performance Items
            </p>
            {performanceMarket.length === 0 ? (
              <p className="text-xs text-muted-foreground">No performance items today.</p>
            ) : (
              <div className="grid gap-2">
                {performanceMarket.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onBuyPerformanceItem(item)}
                    className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/80"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">${item.cost}</span>
                  </button>
                ))}
              </div>
            )}
            {performanceItems.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Owned: {performanceItems.map((item) => item.name).join(", ")}
              </div>
            )}
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
                const isSaleBlocked = Boolean(item.saleBlockedUntilDay && day < item.saleBlockedUntilDay)
                const isListed = item.auctionStatus === "listed"
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
                          <span>
                            Condition: <span className="text-foreground">{item.condition}</span>
                          </span>
                          <span>{item.rarity}</span>
                          <span>Slots: {item.slots}</span>
                          <span>Paper Trail: {heatLabel}</span>
                          <span>{authLabel}</span>
                          {luthierLabel && <span>{luthierLabel}</span>}
                          {item.insured && <span>Insured</span>}
                          {isSaleBlocked && <span>Cooling off (tomorrow)</span>}
                          {isListed && (
                            <span>
                              Auction on StringTree (Day {item.auctionResolveDay ?? "?"})
                            </span>
                          )}
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
                        disabled={
                          item.authStatus === "pending" ||
                          item.luthierStatus === "pending" ||
                          isSaleBlocked ||
                          isListed
                        }
                        className="min-w-[96px]"
                      >
                        Sell
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAuthenticate(item)}
                        disabled={item.authStatus !== "none" || cash < authCost || isListed}
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
                              disabled={isListed}
                            >
                              Luthier: Project → Player (${getLuthierCost(item, "Player")})
                            </Button>
                          )}
                          {item.condition === "Player" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onLuthier(item, "Mint")}
                              disabled={isListed}
                            >
                              Luthier: Player → Mint (${getLuthierCost(item, "Mint")})
                            </Button>
                          )}
                        </>
                      )}
                      {item.rarity === "legendary" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onListAuction(item)}
                          disabled={isListed || item.authStatus === "pending" || item.luthierStatus === "pending"}
                        >
                          {isListed ? "Auction Live" : "Auction on StringTree"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div>Reputation {reputation} • Cash ${cash.toLocaleString()}</div>
          <Button variant="outline" size="sm" onClick={onClose} className="self-end">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
