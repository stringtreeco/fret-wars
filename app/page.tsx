"use client"

import { useEffect, useRef, useState } from "react"
import { Header } from "@/components/game/header"
import { StatusBar } from "@/components/game/status-bar"
import { TerminalFeed } from "@/components/game/terminal-feed"
import { MarketSection } from "@/components/game/market-section"
import { ActionBar } from "@/components/game/action-bar"
import { DealModal } from "@/components/game/deal-modal"
import { TravelModal, type Location } from "@/components/game/travel-modal"
import { InventoryModal } from "@/components/game/inventory-modal"
import { SellModal } from "@/components/game/sell-modal"
import { DuelModal } from "@/components/game/duel-modal"
import { EncounterModal } from "@/components/game/encounter-modal"
import { PlayerAuctionModal } from "@/components/game/player-auction-modal"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { clearRunContext, setRunContext, track } from "@/lib/analytics"

export type HeatLevel = "Low" | "Medium" | "High"
export type Rarity = "common" | "uncommon" | "rare" | "legendary"
export type Condition = "Mint" | "Player" | "Project"
export type BagTier = 0 | 1 | 2

export interface GameState {
  day: number
  totalDays: number
  location: string
  cash: number
  bagTier: BagTier
  inventoryCapacity: number
  inventory: OwnedItem[]
  reputation: number
  heatLevel: HeatLevel
  inspectedMarketIds: string[]
  recentFlipDays: number[]
  isGameOver: boolean
  bestFlip?: {
    name: string
    profit: number
  }
  rarestSold?: {
    name: string
    rarity: Rarity
  }
  tools: {
    serialScanner: boolean
    priceGuide: boolean
    insurancePlan: boolean
    luthierBench: boolean
  }
  pendingDuel: DuelState | null
  pendingEncounter: EncounterState | null
  tradeDeclines: number
  performanceMarket: PerformanceItem[]
  performanceItems: PerformanceItem[]
  market: MarketItem[]
  messages: TerminalMessage[]
  creditLine: {
    frozen: boolean
    loan: null | {
      principal: number
      balanceDue: number
      interestRate: number
      dueDay: number
      defaulted: boolean
      repPenaltyApplied?: boolean
    }
  }
  runSeed: string
}

export interface MarketItem {
  id: string
  name: string
  category: "Guitar" | "Amp" | "Pedal" | "Parts"
  basePrice: number
  priceToday: number
  trend: "up" | "down" | "stable"
  rarity: Rarity
  condition: Condition
  slots: number
  scamRisk: number
  hotRisk: number
  description: string
  flavorText: string
}

export interface OwnedItem extends MarketItem {
  purchasePrice: number
  heatValue: number
  acquiredDay: number
  sameDaySellOk?: boolean
  saleBlockedUntilDay?: number
  auctionStatus?: "none" | "listed"
  auctionListedDay?: number
  auctionResolveDay?: number
  auctionBuyerPremiumRate?: number
  auctionBaselinePrice?: number
  inspected: boolean
  authStatus: "none" | "pending" | "success" | "partial" | "fail"
  authReadyDay?: number
  authMultiplier: number
  authOutcome?: "success" | "partial" | "fail"
  insured: boolean
  insurancePaid: number
  luthierStatus: "none" | "pending" | "complete"
  luthierReadyDay?: number
  luthierTargetCondition?: Condition
}

export interface DuelChallenger {
  id: string
  label: string
  baseSkill: number
  repWin: number
  repLoss: number
  cashMin: number
  cashMax: number
  rareRewardChance: number
  intro: string[]
  win: string[]
  lose: string[]
  tie: string[]
  signatureOptions: DuelOption[]
}

export interface DuelOption {
  id: string
  label: string
  playerBonus: number
  variance: number
  repBonusOnWin: number
}

export interface DuelState {
  challengerId: string
  challengerLabel: string
  intro: string
  wagerAmount: number
  options: DuelOption[]
  round: number
  totalRounds: number
  playerScore: number
  opponentScore: number
  lastReaction?: string
  selectedBoostId?: string
}

export type EncounterState =
  | {
      type: "bulkLot"
      items: MarketItem[]
      vagueItems: string[]
      totalCost: number
      projectRate: number
    }
  | {
      type: "tradeOffer"
      requestedItem: OwnedItem
      offeredItem: MarketItem
    }
  | {
      type: "mysteriousListing"
      item: MarketItem
      proofChecked: boolean
    }
  | {
      type: "auction"
      item: MarketItem
      startingBid: number
      buyerPremiumRate: number
      minReputation: number
      resolved?: {
        outcome:
          | "blocked"
          | "no_bid"
          | "passed"
          | "outbid"
          | "won"
          | "forfeited"
          | "no_space"
        maxBid: number
        finalPrice?: number
        premium?: number
        totalCost?: number
      }
    }
  | {
      type: "repairScare"
      item: OwnedItem
      fullPrice: number
      discountPrice: number
    }

export interface PerformanceItem {
  id: string
  name: string
  description: string
  cost: number
  effect: {
    playerBonus?: number
    varianceBonus?: number
    repBonusOnWin?: number
    opponentPenalty?: number
  }
}

export interface TerminalMessage {
  id: string
  text: string
  type: "info" | "warning" | "success" | "event"
  isArt?: boolean
}

const STORAGE_KEY = "fretwars:state"

const introMessagePool: Array<{
  id: string
  text: string
  type: TerminalMessage["type"]
  listingTag?:
    | "vintage_fender"
    | "touring_band"
    | "pedal_hype"
    | "pickup_batch"
    | "studio_dump"
    | "festival_weekend"
    | "parts_flood"
}> = [
  {
    id: "pedal_hype",
    text: "Market volatility increases after influencer buzz.",
    type: "event",
    listingTag: "pedal_hype",
  },
  {
    id: "vintage_fender",
    text: "Pawn shop owner quietly shows you a vintage Fender case.",
    type: "event",
    listingTag: "vintage_fender",
  },
  {
    id: "parts_flood",
    text: "A local tech warns: 'Watch out for the '62 parts flooding in.'",
    type: "warning",
    listingTag: "parts_flood",
  },
  {
    id: "studio_dump",
    text: "A studio closes and dumps gear at a discount.",
    type: "event",
    listingTag: "studio_dump",
  },
  {
    id: "pickup_batch",
    text: "Collectors are whispering about a rare batch of pickups.",
    type: "info",
    listingTag: "pickup_batch",
  },
  {
    id: "touring_band",
    text: "A touring band just cleared out their storage unit.",
    type: "event",
    listingTag: "touring_band",
  },
  {
    id: "festival_weekend",
    text: "Local listings spike after a festival weekend.",
    type: "event",
    listingTag: "festival_weekend",
  },
]

const marketCatalog = [
  {
    name: "1962 Strat Neck",
    category: "Parts" as const,
    basePrice: 900,
    rarity: "rare" as const,
    scamRisk: 0.25,
    hotRisk: 0.35,
    description: "Pre-CBS Fender neck, rosewood fretboard",
    flavorText: "The seller seems nervous. No case, just the neck wrapped in newspaper.",
  },
  {
    name: "JCM800 Head",
    category: "Amp" as const,
    basePrice: 1800,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.12,
    description: "1983 Marshall JCM800 2203, working condition",
    flavorText: "Comes with original footswitch. Owner says it's been in storage.",
  },
  {
    name: "Klon Centaur",
    category: "Pedal" as const,
    basePrice: 2100,
    rarity: "legendary" as const,
    scamRisk: 0.35,
    hotRisk: 0.25,
    description: "Gold horsie version, serial #2XXX",
    flavorText: "Claims it's 'the real deal.' Wants cash only.",
  },
  {
    name: "1963 Fender Reverb Unit",
    category: "Pedal" as const,
    basePrice: 1200,
    rarity: "rare" as const,
    scamRisk: 0.2,
    hotRisk: 0.1,
    description: "Outboard spring reverb tank, drip for days",
    flavorText: "They bring a tiny amp just to prove it drips. The cables look older than you.",
  },
  {
    name: "1964 Vox AC30 Top Boost",
    category: "Amp" as const,
    basePrice: 1600,
    rarity: "uncommon" as const,
    scamRisk: 0.11,
    hotRisk: 0.08,
    description: "Vintage 2x12 chime machine, loud and proud",
    flavorText: "Tolex is scuffed. Tubes look fresh. It smells faintly like a club stage.",
  },
  {
    name: "Analogman King of Tone",
    category: "Pedal" as const,
    basePrice: 2100,
    rarity: "legendary" as const,
    scamRisk: 0.28,
    hotRisk: 0.12,
    description: "Dual overdrive with internal dip switches, long waitlist mystique",
    flavorText: "Listing says “no trades, no questions.” The photos are weirdly cropped.",
  },
  {
    name: "1960 Gretsch 6120",
    category: "Guitar" as const,
    basePrice: 2600,
    rarity: "rare" as const,
    scamRisk: 0.14,
    hotRisk: 0.14,
    description: "Hollow-body twang cannon, orange stain, Bigsby-equipped",
    flavorText: "You can hear the slapback just looking at it. Case is covered in stickers.",
  },
  {
    name: "1978 Gibson Les Paul Standard",
    category: "Guitar" as const,
    basePrice: 3100,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.12,
    description: "Late-70s Standard, maple neck era, heavy but loud",
    flavorText: "Seller insists it’s “barely played.” The frets say otherwise—in a good way.",
  },
  {
    name: "Matchless DC-30",
    category: "Amp" as const,
    basePrice: 3800,
    rarity: "rare" as const,
    scamRisk: 0.18,
    hotRisk: 0.1,
    description: "Boutique EL84 combo, punchy and articulate",
    flavorText: "A local tech’s number is taped to the handle. That’s either great or ominous.",
  },
  {
    name: "1968 Gibson ES-335",
    category: "Guitar" as const,
    basePrice: 4500,
    rarity: "rare" as const,
    scamRisk: 0.2,
    hotRisk: 0.16,
    description: "Semi-hollow classic, cherry finish, block inlays",
    flavorText: "The seller talks in hushed tones like the guitar might overhear the price.",
  },
  {
    name: "1985 Mesa/Boogie Mark IIC+",
    category: "Amp" as const,
    basePrice: 5200,
    rarity: "legendary" as const,
    scamRisk: 0.24,
    hotRisk: 0.18,
    description: "The high-gain blueprint, tight lows, singing leads",
    flavorText: "Ad says “no lowballs.” The back panel photo is conveniently blurry.",
  },
  {
    name: "1999 Two-Rock Classic Reverb",
    category: "Amp" as const,
    basePrice: 6600,
    rarity: "legendary" as const,
    scamRisk: 0.22,
    hotRisk: 0.12,
    description: "Boutique clean headroom, lush reverb, expensive in every way",
    flavorText: "Seller wants to meet at a bank lobby. Smart. Also… intense.",
  },
  {
    name: "1963 Fender Jazzmaster (Pre-CBS)",
    category: "Guitar" as const,
    basePrice: 7800,
    rarity: "legendary" as const,
    scamRisk: 0.32,
    hotRisk: 0.28,
    description: "Early-60s offset, slab board vibes, vintage-correct hardware",
    flavorText: "The listing is short: “Real. Serious buyers only.” That’s how it starts.",
  },
  {
    name: "Epiphone Casino",
    category: "Guitar" as const,
    basePrice: 725,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.05,
    description: "2019 Inspired By Gibson, sunburst",
    flavorText: "Clean guitar, comes with gig bag. Receipts available.",
  },
  {
    name: "Boss DS-1 Keeley",
    category: "Pedal" as const,
    basePrice: 200,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.02,
    description: "Keeley modded DS-1, seeing tone mod",
    flavorText: "Seller has good reviews. Comes with box.",
  },
  {
    name: "Vintage Tolex Roll",
    category: "Parts" as const,
    basePrice: 140,
    rarity: "uncommon" as const,
    scamRisk: 0.15,
    hotRisk: 0.08,
    description: "Original Fender tweed tolex, 3 yards",
    flavorText: "Smells like a basement. Could be authentic.",
  },
  {
    name: "’70s Jazz Bass",
    category: "Guitar" as const,
    basePrice: 1650,
    rarity: "rare" as const,
    scamRisk: 0.18,
    hotRisk: 0.2,
    description: "Black block inlays, heavy relic wear",
    flavorText: "Seller swears it toured. No docs, just vibes.",
  },
  {
    name: "Tube Screamer TS808",
    category: "Pedal" as const,
    basePrice: 900,
    rarity: "rare" as const,
    scamRisk: 0.2,
    hotRisk: 0.1,
    description: "Original TS808, battery door intact",
    flavorText: "Boxes of pedals behind him. This one sits on top.",
  },
  {
    name: "Silverface Twin Reverb",
    category: "Amp" as const,
    basePrice: 1100,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.08,
    description: "1974 Fender Twin Reverb, loud and clean",
    flavorText: "Garage sale find. Owner says it belonged to an uncle.",
  },
  {
    name: "MXR Carbon Copy",
    category: "Pedal" as const,
    basePrice: 140,
    rarity: "common" as const,
    scamRisk: 0.06,
    hotRisk: 0.05,
    description: "Analog delay with modulation",
    flavorText: "A little dusty, knobs still smooth.",
  },
  {
    name: "P90 Pickup Set",
    category: "Parts" as const,
    basePrice: 180,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.05,
    description: "Cream covers, vintage spec winds",
    flavorText: "Seller calls them 'custom shop', no proof.",
  },
  {
    name: "1966 Mustang",
    category: "Guitar" as const,
    basePrice: 1300,
    rarity: "rare" as const,
    scamRisk: 0.22,
    hotRisk: 0.28,
    description: "Competition stripes, short scale",
    flavorText: "Photos look legit. Seller wants to meet after dark.",
  },
  {
    name: "Mini Plexi Stack",
    category: "Amp" as const,
    basePrice: 750,
    rarity: "uncommon" as const,
    scamRisk: 0.12,
    hotRisk: 0.1,
    description: "Lunchbox head with 1x12 cab",
    flavorText: "Studio owner downsizing. Sounds huge.",
  },
  {
    name: "NOS Capacitor Lot",
    category: "Parts" as const,
    basePrice: 90,
    rarity: "common" as const,
    scamRisk: 0.08,
    hotRisk: 0.02,
    description: "Old stock caps, mixed values",
    flavorText: "Bag looks untouched since the 80s.",
  },
  {
    name: "Fender Deluxe Gig Bag",
    category: "Parts" as const,
    basePrice: 70,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.01,
    description: "Padded Fender bag, fits most electrics",
    flavorText: "A little scuffed but the padding is solid.",
  },
  {
    name: "SKB TSA Hard Case",
    category: "Parts" as const,
    basePrice: 160,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.02,
    description: "Molded hardshell case with TSA latches",
    flavorText: "Stickers from a touring cycle still on it.",
  },
  {
    name: "Hosa Patch Cable Bundle",
    category: "Parts" as const,
    basePrice: 30,
    rarity: "common" as const,
    scamRisk: 0.02,
    hotRisk: 0.01,
    description: "Short patch cables, mixed colors",
    flavorText: "A few are flaky, most are fine.",
  },
  {
    name: "Gotoh Tele Bridge",
    category: "Parts" as const,
    basePrice: 95,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.03,
    description: "Tele bridge with compensated saddles",
    flavorText: "Clean plating, light pick wear.",
  },
  {
    name: "Sylvania 6L6GC Pair",
    category: "Parts" as const,
    basePrice: 140,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.03,
    description: "Matched pair, tested and labeled",
    flavorText: "Seller shows test numbers in a notebook.",
  },
  {
    name: "Weller Soldering Station",
    category: "Parts" as const,
    basePrice: 90,
    rarity: "uncommon" as const,
    scamRisk: 0.03,
    hotRisk: 0.01,
    description: "Temperature-controlled station with tips",
    flavorText: "Warm in 30 seconds. Looks shop-owned.",
  },
  {
    name: "Boss SD-1",
    category: "Pedal" as const,
    basePrice: 70,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.02,
    description: "Classic Super OverDrive, yellow",
    flavorText: "Every local shop has one. This one's clean.",
  },
  {
    name: "ProCo Rat 2",
    category: "Pedal" as const,
    basePrice: 95,
    rarity: "common" as const,
    scamRisk: 0.04,
    hotRisk: 0.02,
    description: "The standard Rat distortion",
    flavorText: "Velcro on the bottom. That means it's loved.",
  },
  {
    name: "MXR Phase 90",
    category: "Pedal" as const,
    basePrice: 130,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.02,
    description: "Orange box, single knob",
    flavorText: "Slight scratch in the logo. No box.",
  },
  {
    name: "Boss TU-3",
    category: "Pedal" as const,
    basePrice: 75,
    rarity: "common" as const,
    scamRisk: 0.02,
    hotRisk: 0.01,
    description: "Stage tuner, built like a tank",
    flavorText: "Always on, always reliable.",
  },
  {
    name: "Electro-Harmonix Big Muff",
    category: "Pedal" as const,
    basePrice: 110,
    rarity: "common" as const,
    scamRisk: 0.04,
    hotRisk: 0.03,
    description: "NYC reissue fuzz",
    flavorText: "Muffs everything. In a good way.",
  },
  {
    name: "Way Huge Aqua Puss",
    category: "Pedal" as const,
    basePrice: 160,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.04,
    description: "Analog delay with splashy repeats",
    flavorText: "The repeats sound like a tape machine.",
  },
  {
    name: "Strymon El Capistan",
    category: "Pedal" as const,
    basePrice: 260,
    rarity: "uncommon" as const,
    scamRisk: 0.09,
    hotRisk: 0.05,
    description: "Tape echo simulator, minty",
    flavorText: "Knobs feel smooth. Seller seems legit.",
  },
  {
    name: "Vintage Fuzz Face",
    category: "Pedal" as const,
    basePrice: 550,
    rarity: "rare" as const,
    scamRisk: 0.22,
    hotRisk: 0.12,
    description: "Round enclosure, germanium",
    flavorText: "Seller claims original transistors.",
  },
  {
    name: "Line 6 DL4 (Green)",
    category: "Pedal" as const,
    basePrice: 200,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.04,
    description: "Looper/delay workhorse",
    flavorText: "Stomp switches feel a little crunchy.",
  },
  {
    name: "Fender Frontman 10G",
    category: "Amp" as const,
    basePrice: 70,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.01,
    description: "Small solid-state practice combo",
    flavorText: "Clean channel is fine. Drive is harsh.",
  },
  {
    name: "Fender Blues Junior",
    category: "Amp" as const,
    basePrice: 350,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.05,
    description: "15W tube combo, giggable",
    flavorText: "Tolex is clean, tubes are warm.",
  },
  {
    name: "Fender Hot Rod Deluxe",
    category: "Amp" as const,
    basePrice: 450,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.06,
    description: "40W tube combo, loud",
    flavorText: "Seller warns: it gets loud fast.",
  },
  {
    name: "Peavey Classic 30",
    category: "Amp" as const,
    basePrice: 380,
    rarity: "uncommon" as const,
    scamRisk: 0.07,
    hotRisk: 0.05,
    description: "Workhorse combo, reliable",
    flavorText: "Gig tape still on the handle.",
  },
  {
    name: "Orange Tiny Terror",
    category: "Amp" as const,
    basePrice: 420,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.06,
    description: "Tiny head, big sound",
    flavorText: "Looks like it sat on a lot of cabs.",
  },
  {
    name: "Roland JC-120",
    category: "Amp" as const,
    basePrice: 650,
    rarity: "rare" as const,
    scamRisk: 0.12,
    hotRisk: 0.08,
    description: "Stereo clean machine",
    flavorText: "Chorus is lush. It's a heavy lift.",
  },
  {
    name: "MIM Stratocaster",
    category: "Guitar" as const,
    basePrice: 420,
    rarity: "common" as const,
    scamRisk: 0.06,
    hotRisk: 0.04,
    description: "Made in Mexico Strat, sunburst",
    flavorText: "Action set low. Plays easy.",
  },
  {
    name: "Squier Classic Vibe Tele",
    category: "Guitar" as const,
    basePrice: 320,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.03,
    description: "Surprisingly good for the price",
    flavorText: "Seller says it 'punches above its weight.'",
  },
  {
    name: "Epiphone Sheraton II",
    category: "Guitar" as const,
    basePrice: 520,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.05,
    description: "Semi-hollow, gold hardware",
    flavorText: "Plays smooth. A little tarnish.",
  },
  {
    name: "Gibson SG Standard",
    category: "Guitar" as const,
    basePrice: 1250,
    rarity: "rare" as const,
    scamRisk: 0.2,
    hotRisk: 0.18,
    description: "Cherry SG with burstbuckers",
    flavorText: "Seller has an old receipt and a firm price.",
  },
  {
    name: "Gretsch Streamliner",
    category: "Guitar" as const,
    basePrice: 450,
    rarity: "common" as const,
    scamRisk: 0.07,
    hotRisk: 0.04,
    description: "Hollow-body sparkle finish",
    flavorText: "A little scratch near the jack.",
  },
  {
    name: "Yamaha Revstar",
    category: "Guitar" as const,
    basePrice: 620,
    rarity: "uncommon" as const,
    scamRisk: 0.08,
    hotRisk: 0.05,
    description: "Modern classic with P90s",
    flavorText: "Neck feels fast. Seller is chatty.",
  },
  {
    name: "Ibanez RG550",
    category: "Guitar" as const,
    basePrice: 700,
    rarity: "uncommon" as const,
    scamRisk: 0.1,
    hotRisk: 0.06,
    description: "Superstrat with locking trem",
    flavorText: "Original case but missing trem arm.",
  },
  {
    name: "Martin D-18 (Used)",
    category: "Guitar" as const,
    basePrice: 1600,
    rarity: "rare" as const,
    scamRisk: 0.22,
    hotRisk: 0.15,
    description: "Mahogany dreadnought, warm",
    flavorText: "Smells like cedar and old coffee.",
  },
  {
    name: "Takamine EG340",
    category: "Guitar" as const,
    basePrice: 380,
    rarity: "common" as const,
    scamRisk: 0.06,
    hotRisk: 0.03,
    description: "Stage acoustic with pickup",
    flavorText: "Case included. Strap locks on it.",
  },
  {
    name: "Project Strat Body",
    category: "Parts" as const,
    basePrice: 150,
    rarity: "common" as const,
    scamRisk: 0.06,
    hotRisk: 0.04,
    description: "Stripped body, needs hardware",
    flavorText: "Bare wood, a few dents.",
  },
  {
    name: "Loaded Pickguard",
    category: "Parts" as const,
    basePrice: 120,
    rarity: "common" as const,
    scamRisk: 0.05,
    hotRisk: 0.03,
    description: "Single-coil set prewired",
    flavorText: "Looks clean, seller swaps parts often.",
  },
  {
    name: "Vintage Tremolo Arm",
    category: "Parts" as const,
    basePrice: 55,
    rarity: "common" as const,
    scamRisk: 0.04,
    hotRisk: 0.02,
    description: "Screw-in trem arm, aged",
    flavorText: "Probably came off a Japanese copy.",
  },
  {
    name: "Pedal Power Supply",
    category: "Parts" as const,
    basePrice: 120,
    rarity: "uncommon" as const,
    scamRisk: 0.06,
    hotRisk: 0.02,
    description: "Isolated outputs, 8 taps",
    flavorText: "Comes with a messy bag of cables.",
  },
  {
    name: "Flight Case (Road)",
    category: "Parts" as const,
    basePrice: 180,
    rarity: "uncommon" as const,
    scamRisk: 0.05,
    hotRisk: 0.03,
    description: "Road case with dents and stickers",
    flavorText: "Smells like backstage beer and smoke.",
  },
  {
    name: "Boss CE-2",
    category: "Pedal" as const,
    basePrice: 320,
    rarity: "rare" as const,
    scamRisk: 0.18,
    hotRisk: 0.1,
    description: "Classic chorus, blue label",
    flavorText: "Seller talks about Japanese circuits.",
  },
  {
    name: "Eventide H9",
    category: "Pedal" as const,
    basePrice: 500,
    rarity: "rare" as const,
    scamRisk: 0.16,
    hotRisk: 0.08,
    description: "Multi-effect powerhouse",
    flavorText: "License transfer not confirmed.",
  },
  {
    name: "Chase Bliss Mood",
    category: "Pedal" as const,
    basePrice: 380,
    rarity: "rare" as const,
    scamRisk: 0.14,
    hotRisk: 0.06,
    description: "Experimental delay/looper",
    flavorText: "Hard to find locally. Seller is cagey.",
  },
  {
    name: "Dumble ODS Clone",
    category: "Amp" as const,
    basePrice: 2400,
    rarity: "legendary" as const,
    scamRisk: 0.35,
    hotRisk: 0.25,
    description: "Handwired boutique head",
    flavorText: "Seller says it's 'close enough.'",
  },
  {
    name: "’50s Tweed Champ",
    category: "Amp" as const,
    basePrice: 2600,
    rarity: "legendary" as const,
    scamRisk: 0.3,
    hotRisk: 0.22,
    description: "Tiny vintage combo, original tweed",
    flavorText: "Looks like a museum piece.",
  },
  {
    name: "Custom Shop Tele",
    category: "Guitar" as const,
    basePrice: 2800,
    rarity: "legendary" as const,
    scamRisk: 0.28,
    hotRisk: 0.2,
    description: "Relic finish, COA included",
    flavorText: "Seller keeps it in a velvet-lined case.",
  },
  {
    name: "Pre-CBS Jazzmaster",
    category: "Guitar" as const,
    basePrice: 4200,
    rarity: "legendary" as const,
    scamRisk: 0.4,
    hotRisk: 0.3,
    description: "Offset holy grail, slab board",
    flavorText: "Serial photos are blurry on purpose.",
  },
  {
    name: "Vintage PAF Set",
    category: "Parts" as const,
    basePrice: 2200,
    rarity: "legendary" as const,
    scamRisk: 0.35,
    hotRisk: 0.25,
    description: "Original PAF humbuckers",
    flavorText: "Seller refuses to ship. Meet only.",
  },
  {
    name: "1959 Les Paul Standard",
    category: "Guitar" as const,
    basePrice: 120000,
    rarity: "legendary" as const,
    scamRisk: 0.5,
    hotRisk: 0.35,
    description: "Burst finish, the holy grail",
    flavorText: "Seller wants to meet with a loupe and a lawyer.",
  },
  {
    name: "1965 Fender Deluxe Reverb",
    category: "Amp" as const,
    basePrice: 3200,
    rarity: "legendary" as const,
    scamRisk: 0.3,
    hotRisk: 0.2,
    description: "Blackface classic, sparkling clean",
    flavorText: "Original speaker and drip edge trim.",
  },
  {
    name: "Vox AC30 Top Boost",
    category: "Amp" as const,
    basePrice: 2400,
    rarity: "rare" as const,
    scamRisk: 0.22,
    hotRisk: 0.16,
    description: "Chimey British combo",
    flavorText: "Seller says it sat in a church basement for years.",
  },
  {
    name: "Gibson ES-335",
    category: "Guitar" as const,
    basePrice: 3200,
    rarity: "rare" as const,
    scamRisk: 0.25,
    hotRisk: 0.18,
    description: "Classic semi-hollow, cherry",
    flavorText: "Plays like butter. Case smells like old smoke.",
  },
  {
    name: "1962 Fender Stratocaster",
    category: "Guitar" as const,
    basePrice: 18000,
    rarity: "legendary" as const,
    scamRisk: 0.4,
    hotRisk: 0.3,
    description: "Pre-CBS Strat, slab board",
    flavorText: "The neck stamps are crisp. The price is not.",
  },
  {
    name: "1952 Fender Telecaster",
    category: "Guitar" as const,
    basePrice: 26000,
    rarity: "legendary" as const,
    scamRisk: 0.42,
    hotRisk: 0.3,
    description: "Blackguard legend",
    flavorText: "Butterscotch finish, brass saddles.",
  },
  {
    name: "Gibson SG Standard '61 Reissue",
    category: "Guitar" as const,
    basePrice: 1900,
    rarity: "uncommon" as const,
    scamRisk: 0.14,
    hotRisk: 0.1,
    description: "Slim neck, vibrola",
    flavorText: "Looks stage-ready. Smells like fresh strings.",
  },
  {
    name: "Fender Precision Bass '57 Reissue",
    category: "Guitar" as const,
    basePrice: 1800,
    rarity: "uncommon" as const,
    scamRisk: 0.12,
    hotRisk: 0.08,
    description: "Maple neck, classic thump",
    flavorText: "One owner, lots of sessions.",
  },
  {
    name: "Gibson Flying V '67 Reissue",
    category: "Guitar" as const,
    basePrice: 2500,
    rarity: "rare" as const,
    scamRisk: 0.2,
    hotRisk: 0.15,
    description: "Mahogany, sharp lines",
    flavorText: "Case barely fits. Seller grins.",
  },
  {
    name: "Dunlop Cry Baby GCB95",
    category: "Pedal" as const,
    basePrice: 95,
    rarity: "common" as const,
    scamRisk: 0.04,
    hotRisk: 0.02,
    description: "The classic wah",
    flavorText: "Heel-down squeak included.",
  },
  {
    name: "Electro-Harmonix Big Muff Pi (Triangle)",
    category: "Pedal" as const,
    basePrice: 900,
    rarity: "rare" as const,
    scamRisk: 0.28,
    hotRisk: 0.12,
    description: "Vintage fuzz, triangle logo",
    flavorText: "Looks honest. Sounds huge.",
  },
  {
    name: "Boss CE-1 Chorus Ensemble",
    category: "Pedal" as const,
    basePrice: 200,
    rarity: "uncommon" as const,
    scamRisk: 0.12,
    hotRisk: 0.06,
    description: "Late-70s chorus/vibrato unit, warm preamp",
    flavorText: "Big box, big vibe. Seller says it’s “the sound you’ve heard a thousand times.”",
  },
  {
    name: "MXR Script Phase 90",
    category: "Pedal" as const,
    basePrice: 750,
    rarity: "rare" as const,
    scamRisk: 0.22,
    hotRisk: 0.1,
    description: "Script logo classic phaser",
    flavorText: "Orange box, script logo, big vibe.",
  },
  {
    name: "Marshall 1959 Super Lead",
    category: "Amp" as const,
    basePrice: 4200,
    rarity: "legendary" as const,
    scamRisk: 0.3,
    hotRisk: 0.22,
    description: "Plexi-era head",
    flavorText: "Loud enough to melt paint.",
  },
  {
    name: "Fender '65 Twin Reverb Reissue",
    category: "Amp" as const,
    basePrice: 1200,
    rarity: "uncommon" as const,
    scamRisk: 0.12,
    hotRisk: 0.08,
    description: "Modern classic, huge clean headroom",
    flavorText: "Looks new, wheels still on.",
  },
  {
    name: "Fender '57 Strat Pickup Set",
    category: "Parts" as const,
    basePrice: 300,
    rarity: "uncommon" as const,
    scamRisk: 0.16,
    hotRisk: 0.08,
    description: "Vintage-voiced single coils",
    flavorText: "Wax potted and marked by hand.",
  },
  {
    name: "Switchcraft Jack Set",
    category: "Parts" as const,
    basePrice: 45,
    rarity: "common" as const,
    scamRisk: 0.03,
    hotRisk: 0.02,
    description: "Gold standard jacks, pack of 3",
    flavorText: "Tech drawer staple.",
  },
]

const marketShiftEvents = [
  { id: "hype", text: "Influencer buzz is driving boutique gear prices up." },
  { id: "estate_glut", text: "A wave of estate sales is pushing vintage prices down." },
  { id: "pawn_flush", text: "Touring musicians just got home. Pawn shops are packed with gear." },
  { id: "collectors_quiet", text: "Collectors are out of town at a conference. Less competition for local deals." },
  { id: "audit_nerves", text: "Rumor has it a shop got audited. Sellers are feeling cautious." },
] as const

type MarketShiftEvent = (typeof marketShiftEvents)[number]

const repoMessages = [
  "A venue manager runs serial checks. Paper trail gets tense.",
  "A consignment shop pauses intake after a provenance sweep.",
  "Buyers back out after a listing audit.",
  "A recovery agent is asking around for missing gear.",
]

const locationModifiers = {
  "Downtown Music Row": { Guitar: 0.05, Amp: 0.03, Pedal: 0.03, Parts: 0.02 },
  "Vintage Alley": { Guitar: 0.07, Amp: 0.05, Pedal: 0.04, Parts: 0.02 },
  "The Warehouse District": { Guitar: -0.02, Amp: -0.04, Pedal: -0.01, Parts: -0.03 },
  "Suburban Pawn Shops": { Guitar: -0.01, Amp: 0.01, Pedal: -0.02, Parts: 0.0 },
  "The Underground": { Guitar: 0.04, Amp: 0.06, Pedal: 0.05, Parts: 0.01 },
}

const rarityWeights: Record<Rarity, number> = {
  common: 55,
  uncommon: 30,
  rare: 12,
  legendary: 3,
}

const rarityRank: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 4,
}

const conditionWeights: Record<Condition, number> = {
  Mint: 20,
  Player: 60,
  Project: 20,
}

const conditionMultiplier: Record<Condition, number> = {
  Mint: 1.1,
  Player: 1.0,
  Project: 0.85,
}

const TOOL_COSTS = {
  serialScanner: 350,
  priceGuide: 250,
  insurancePlan: 300,
  luthierBench: 500,
}

const PLAYER_AUCTION_BUYER_PREMIUM_RATE = 0.05

const performanceCatalog: PerformanceItem[] = [
  {
    id: "fresh_strings",
    name: "Fresh Strings",
    description: "Snappier attack and better intonation for the next jam.",
    cost: 60,
    effect: { playerBonus: 6 },
  },
  {
    id: "slide",
    name: "Slide",
    description: "Adds expressive range, but it can get wild.",
    cost: 45,
    effect: { varianceBonus: 14 },
  },
  {
    id: "aerospace_pick",
    name: "Aerospace Pick",
    description: "Fast, precise, and a little flashy. Judges notice.",
    cost: 90,
    effect: { repBonusOnWin: 2 },
  },
  {
    id: "custom_strap",
    name: "Custom Strap",
    description: "You look the part. The crowd leans your way.",
    cost: 75,
    effect: { playerBonus: 4, varianceBonus: 4 },
  },
]

const vagueDescriptors = [
  "Vintage-looking guitar",
  "Scuffed combo amp",
  "Mystery overdrive pedal",
  "Dusty hard case",
  "Old parts box",
  "Road-worn pedalboard",
]

const duelChallengers: DuelChallenger[] = [
  {
    id: "busker",
    label: "Busker with a Well-Worn Martin",
    baseSkill: 22,
    repWin: 2,
    repLoss: 1,
    cashMin: 80,
    cashMax: 160,
    rareRewardChance: 0.08,
    intro: [
      "A busker tips his cap. 'Care to trade a tune?' The sidewalk turns into a stage.",
      "You catch a street player in a deep groove. He grins and taps the case.",
    ],
    win: [
      "You own the sidewalk jam. The hat fills fast and a collector asks for your card.",
      "Your groove locks in. The busker laughs and hands you the hat with a wink.",
    ],
    lose: [
      "You miss a change. The busker steals the corner and the crowd stays with him.",
      "The street player’s rhythm is relentless. You get played off with a smile.",
    ],
    tie: [
      "It’s a friendly draw. The crowd claps for both of you.",
      "No clear winner. You trade nods and keep it moving.",
    ],
    signatureOptions: [
      { id: "busker_waltz", label: "Travis-Pick Flourish", playerBonus: 6, variance: 22, repBonusOnWin: 2 },
    ],
  },
  {
    id: "teen_punk",
    label: "Teenage Punk with a Squier",
    baseSkill: 28,
    repWin: 3,
    repLoss: 2,
    cashMin: 90,
    cashMax: 190,
    rareRewardChance: 0.1,
    intro: [
      "A teenage punk stomps a combo on. 'Show me what you’ve got.'",
      "A wall of distortion hits. The kid grins and dares you to match it.",
    ],
    win: [
      "You outplay the punk and keep it tasteful. The crowd whoops.",
      "Your lead cuts through the noise. The kid laughs and tosses you a pick.",
    ],
    lose: [
      "The punk’s energy wins the crowd. You get drowned out.",
      "It’s loud, fast, and messy. The pit votes against you.",
    ],
    tie: [
      "Equal chaos. The crowd can’t pick a winner.",
      "It’s all noise and smiles. Call it a draw.",
    ],
    signatureOptions: [
      { id: "punk_speed", label: "Power-Chord Frenzy", playerBonus: 10, variance: 40, repBonusOnWin: 0 },
    ],
  },
  {
    id: "frontman",
    label: "Local Frontman",
    baseSkill: 34,
    repWin: 4,
    repLoss: 3,
    cashMin: 120,
    cashMax: 240,
    rareRewardChance: 0.14,
    intro: [
      "A local frontman steps offstage and points your way. The room goes quiet.",
      "The venue clears a space. The frontman wants a quick showdown.",
    ],
    win: [
      "You take the room. The crowd chants and you get fresh leads.",
      "Your run is clean and confident. The frontman nods, impressed.",
    ],
    lose: [
      "The frontman steals the spotlight. You lose the room.",
      "They’ve done this a hundred times. You slip and they soar.",
    ],
    tie: [
      "The crowd splits. No clear winner tonight.",
      "Two strong sets, no verdict.",
    ],
    signatureOptions: [
      { id: "frontman_hook", label: "Stadium Howl", playerBonus: 8, variance: 30, repBonusOnWin: 2 },
    ],
  },
  {
    id: "session_ace",
    label: "Session Ace",
    baseSkill: 38,
    repWin: 5,
    repLoss: 4,
    cashMin: 140,
    cashMax: 280,
    rareRewardChance: 0.2,
    intro: [
      "A session ace spots your case and smirks. 'One take?'",
      "A studio guitarist offers a clean showdown. High stakes, clean tone.",
    ],
    win: [
      "You outplay a pro. The room goes quiet, then erupts.",
      "Your tone is immaculate. The ace tips their cap.",
    ],
    lose: [
      "The ace’s timing is perfect. You can’t match it.",
      "You play well, but the pro is surgical.",
    ],
    tie: [
      "Two pros, one room. The crowd just listens.",
      "Nobody blinks. It’s a draw.",
    ],
    signatureOptions: [
      { id: "ace_take", label: "Chicken Pickin' Fury", playerBonus: 14, variance: 28, repBonusOnWin: 1 },
    ],
  },
  {
    id: "festival",
    label: "Festival Headliner",
    baseSkill: 32,
    repWin: 3,
    repLoss: 3,
    cashMin: 100,
    cashMax: 220,
    rareRewardChance: 0.12,
    intro: [
      "A festival headliner is killing time backstage. 'Jam?'",
      "You catch a soundcheck. The headliner wants a quick duel.",
    ],
    win: [
      "You light up the green room. People ask for your card.",
      "You win the jam. A tech whispers about a rare listing.",
    ],
    lose: [
      "The headliner’s set is tight. You lose by a hair.",
      "You play well, but they’ve got the crowd.",
    ],
    tie: [
      "Friendly tie. Everyone laughs and moves on.",
      "No winner, just good music.",
    ],
    signatureOptions: [
      { id: "festival_chorus", label: "Smoking Solo", playerBonus: 9, variance: 33, repBonusOnWin: 1 },
    ],
  },
]

const duelOptions: DuelOption[] = [
  { id: "shred", label: "Shred Hard", playerBonus: 12, variance: 45, repBonusOnWin: 0 },
  { id: "pentatonic", label: "Play Pentatonic", playerBonus: 6, variance: 25, repBonusOnWin: 1 },
  { id: "pocket", label: "Tasteful Pocket", playerBonus: 4, variance: 20, repBonusOnWin: 2 },
  { id: "crowd", label: "Crowd Pleaser", playerBonus: 8, variance: 35, repBonusOnWin: 1 },
]

const getDuelRounds = (challengerId: string) => {
  switch (challengerId) {
    case "busker":
      return 1
    case "teen_punk":
      return 2
    case "festival":
      return 3
    case "frontman":
      return 3
    case "session_ace":
      return 4
    default:
      return 2
  }
}

const getDuelWagerAmount = (challengerId: string) => {
  // Higher difficulty => higher stake. Top tier is ~ $1143.
  switch (challengerId) {
    case "busker":
      return 180
    case "teen_punk":
      return 420
    case "festival":
      return 780
    case "frontman":
      return 780
    case "session_ace":
      return 1143
    default:
      return 420
  }
}

const AUCTION_CHANCE = 0.08
const AUCTION_BUYER_PREMIUM_RATE = 0.05
const AUCTION_MIN_REPUTATION = 30

const CREDIT_TERM_DAYS = 3
const CREDIT_GARNISH_RATE = 0.3
const BAG_BASE_CAPACITY = 11
const BAG_TIER_BONUS = 5
const getBagCapacity = (tier: BagTier) => BAG_BASE_CAPACITY + BAG_TIER_BONUS * tier
const getBagLabel = (tier: BagTier) => (tier === 2 ? "Flight Case" : tier === 1 ? "Hard Case" : "Gig Bag")
const inferBagTier = (capacity: number): BagTier => {
  if (capacity >= BAG_BASE_CAPACITY + BAG_TIER_BONUS * 2) return 2
  if (capacity >= BAG_BASE_CAPACITY + BAG_TIER_BONUS) return 1
  return 0
}
const getCreditLimit = (reputation: number) => {
  if (reputation >= 80) return 25_000
  if (reputation >= 65) return 15_000
  if (reputation >= 50) return 7_500
  if (reputation >= 30) return 2_500
  return 0
}

const getCreditInterestRate = (reputation: number) => {
  if (reputation >= 80) return 0.1
  if (reputation >= 65) return 0.15
  if (reputation >= 50) return 0.2
  if (reputation >= 30) return 0.25
  return 0.35
}

const pickAuctionLegendary = (runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-auction-${day}-${location}`))
  const legendary = marketCatalog.filter((item) => item.rarity === "legendary")
  if (legendary.length === 0) return marketCatalog[Math.floor(rng() * marketCatalog.length)]
  return legendary[Math.floor(rng() * legendary.length)]
}

const buildAuctionItem = (runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-auction-item-${day}-${location}`))
  const baseItem = pickAuctionLegendary(runSeed, day, location)
  const rarity = baseItem.rarity
  const condition = pickWeighted(
    rng,
    Object.keys(conditionWeights) as Condition[],
    Object.values(conditionWeights)
  )
  const slots = baseItem.category === "Amp" ? 3 : baseItem.category === "Guitar" ? 2 : 1
  const basePrice = baseItem.basePrice
  // Auctions swing harder than regular market listings: big steals and big blowouts.
  const swing = 0.65 + rng() * 1.1 // 65%–175%
  const priceToday = Math.max(50, Math.round(basePrice * swing * conditionMultiplier[condition]))
  return {
    id: buildMarketId(day, location, `auction-${baseItem.name}`),
    name: baseItem.name,
    category: baseItem.category,
    basePrice,
    priceToday,
    trend: "stable" as const,
    rarity,
    condition,
    slots,
    scamRisk: Math.max(0.02, baseItem.scamRisk - 0.15),
    hotRisk: baseItem.hotRisk,
    description: baseItem.description,
    flavorText: `StringTree Live Auction: ${baseItem.flavorText}`,
  } satisfies MarketItem
}

const getAuctionStartingBid = (basePrice: number, runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-auction-start-${day}-${location}-${basePrice}`))
  // Lower/looser opening bids to enable true "steal" outcomes.
  const pct = 0.42 + rng() * 0.26 // 42%–68%
  return Math.max(100, Math.round(basePrice * pct))
}

const getAuctionIncrement = (basePrice: number) => {
  if (basePrice < 1500) return 25
  if (basePrice < 4000) return 50
  if (basePrice < 8000) return 100
  if (basePrice < 20000) return 250
  return 500
}

const simulateAuctionOpponentMax = (basePrice: number, runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-auction-opp-${day}-${location}-${basePrice}`))
  // Proxy-bid opponent is much more volatile than normal market pricing.
  // Typical range: ~45%–165% of base. Sometimes the room goes wild: up to ~290%.
  const spike = rng() < 0.22 ? 0.4 + rng() * 0.9 : 0
  const pct = 0.45 + rng() * 1.2 + spike
  return Math.max(50, Math.round(basePrice * pct))
}

const hashSeed = (input: string) => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const pickWeighted = <T,>(rng: () => number, items: T[], weights: number[]) => {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const roll = rng() * total
  let acc = 0
  for (let i = 0; i < items.length; i += 1) {
    acc += weights[i]
    if (roll <= acc) return items[i]
  }
  return items[items.length - 1]
}

const getTrend = (priceToday: number, basePrice: number): MarketItem["trend"] => {
  const delta = (priceToday - basePrice) / basePrice
  if (delta > 0.06) return "up"
  if (delta < -0.06) return "down"
  return "stable"
}

const buildMarketId = (name: string, day: number, location: string, index: number) =>
  `${day}-${location}-${name}-${index}`.replace(/\s+/g, "-").toLowerCase()

const generateMarket = (day: number, location: string, runSeed: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-${day}-${location}`))
  const count = 7 + Math.floor(rng() * 3)
  const locationBias = locationModifiers[location as keyof typeof locationModifiers] ?? {
    Guitar: 0,
    Amp: 0,
    Pedal: 0,
    Parts: 0,
  }

  const pool = [...marketCatalog]
  const results: MarketItem[] = []

  for (let i = 0; i < count; i += 1) {
    const candidate = pickWeighted(
      rng,
      pool,
      pool.map((item) => rarityWeights[item.rarity])
    )
    const condition = pickWeighted(
      rng,
      Object.keys(conditionWeights) as Condition[],
      Object.values(conditionWeights)
    )
    const drift = (rng() - 0.5) * 0.3
    const locationDrift = locationBias[candidate.category] ?? 0
    const priceToday = Math.max(
      40,
      Math.round(candidate.basePrice * (1 + drift + locationDrift) * conditionMultiplier[condition])
    )
    const slots = candidate.category === "Amp" ? 3 : candidate.category === "Guitar" ? 2 : 1
    results.push({
      id: buildMarketId(candidate.name, day, location, i),
      name: candidate.name,
      category: candidate.category,
      basePrice: candidate.basePrice,
      priceToday,
      trend: getTrend(priceToday, candidate.basePrice),
      rarity: candidate.rarity,
      condition,
      slots,
      scamRisk: candidate.scamRisk,
      hotRisk: candidate.hotRisk,
      description: candidate.description,
      flavorText: candidate.flavorText,
    })
  }

  const hasLowPrice = results.some((item) => item.priceToday <= 300)
  if (!hasLowPrice) {
    const lowPool = marketCatalog.filter((item) => item.basePrice <= 300)
    if (lowPool.length > 0) {
      const base = lowPool[Math.floor(rng() * lowPool.length)]
      const condition = pickWeighted(
        rng,
        Object.keys(conditionWeights) as Condition[],
        Object.values(conditionWeights)
      )
      const locationDrift = locationBias[base.category] ?? 0
      const priceToday = Math.max(
        40,
        Math.round(base.basePrice * (1 + (rng() - 0.5) * 0.2 + locationDrift) * conditionMultiplier[condition])
      )
      const slots = base.category === "Amp" ? 3 : base.category === "Guitar" ? 2 : 1
      results[rng() < 0.5 ? 0 : results.length - 1] = {
        id: buildMarketId(base.name, day, location, Math.floor(rng() * 1000)),
        name: base.name,
        category: base.category,
        basePrice: base.basePrice,
        priceToday,
        trend: getTrend(priceToday, base.basePrice),
        rarity: base.rarity,
        condition,
        slots,
        scamRisk: base.scamRisk,
        hotRisk: base.hotRisk,
        description: base.description,
        flavorText: base.flavorText,
      }
    }
  }

  const legendaryCount = results.filter((item) => item.rarity === "legendary").length
  if (legendaryCount > 1) {
    const indices = results
      .map((item, index) => (item.rarity === "legendary" ? index : -1))
      .filter((index) => index >= 0)
    for (let i = 1; i < indices.length; i += 1) {
      const base = pool[Math.floor(rng() * pool.length)]
      const condition = pickWeighted(
        rng,
        Object.keys(conditionWeights) as Condition[],
        Object.values(conditionWeights)
      )
      const locationDrift = locationBias[base.category] ?? 0
      const priceToday = Math.max(
        40,
        Math.round(base.basePrice * (1 + (rng() - 0.5) * 0.3 + locationDrift) * conditionMultiplier[condition])
      )
      const slots = base.category === "Amp" ? 3 : base.category === "Guitar" ? 2 : 1
      results[indices[i]] = {
        id: buildMarketId(base.name, day, location, Math.floor(rng() * 1000)),
        name: base.name,
        category: base.category,
        basePrice: base.basePrice,
        priceToday,
        trend: getTrend(priceToday, base.basePrice),
        rarity: base.rarity,
        condition,
        slots,
        scamRisk: base.scamRisk,
        hotRisk: base.hotRisk,
        description: base.description,
        flavorText: base.flavorText,
      }
    }
  }

  return results
}

const generatePerformanceMarket = (day: number, location: string, runSeed: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-perf-${day}-${location}`))
  const count = rng() > 0.55 ? 2 : 1
  const pool = [...performanceCatalog]
  const picks: PerformanceItem[] = []
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(rng() * pool.length)
    picks.push(pool.splice(index, 1)[0])
  }
  return picks
}

const getMarketShiftEvent = (day: number, location: string, runSeed: string): MarketShiftEvent => {
  const rng = mulberry32(hashSeed(`${runSeed}-shift-${day}-${location}`))
  return marketShiftEvents[Math.floor(rng() * marketShiftEvents.length)]
}

const applyMarketShift = (
  shift: MarketShiftEvent,
  market: MarketItem[],
  runSeed: string,
  day: number,
  location: string
) => {
  if (shift.id === "pawn_flush") {
    const rng = mulberry32(hashSeed(`${runSeed}-super-deals-${day}-${location}`))
    const dealCount = rng() < 0.5 ? 1 : 2
    const indices = market
      .map((_, index) => index)
      .sort(() => rng() - 0.5)
      .slice(0, dealCount)
    return market.map((item, index) => {
      if (!indices.includes(index)) return item
      const superPrice = Math.max(30, Math.round(item.basePrice * (0.45 + rng() * 0.15)))
      return {
        ...item,
        priceToday: superPrice,
        trend: "down" as const,
        flavorText: `Pawn shop deal: ${item.flavorText}`,
      }
    })
  }

  if (shift.id === "hype") {
    const rng = mulberry32(hashSeed(`${runSeed}-hype-${day}-${location}`))
    const hypeTargets = market
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.item.category === "Pedal")
      .sort(() => rng() - 0.5)
      .slice(0, 2)
    const targetIndices = new Set(hypeTargets.map((entry) => entry.index))
    return market.map((item, index) => {
      if (!targetIndices.has(index)) return item
      const spike = Math.round(item.basePrice * (1.2 + rng() * 0.2))
      return {
        ...item,
        priceToday: spike,
        trend: "up" as const,
        flavorText: `Hype spike: ${item.flavorText}`,
      }
    })
  }

  if (shift.id === "estate_glut") {
    const rng = mulberry32(hashSeed(`${runSeed}-estate-${day}-${location}`))
    const vintageTargets = market
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.item.category === "Guitar" || entry.item.category === "Amp")
      .sort(() => rng() - 0.5)
      .slice(0, 2)
    const targetIndices = new Set(vintageTargets.map((entry) => entry.index))
    return market.map((item, index) => {
      if (!targetIndices.has(index)) return item
      const discount = Math.round(item.basePrice * (0.65 + rng() * 0.15))
      return {
        ...item,
        priceToday: discount,
        trend: "down" as const,
        flavorText: `Estate sale find: ${item.flavorText}`,
      }
    })
  }

  if (shift.id === "collectors_quiet") {
    const rng = mulberry32(hashSeed(`${runSeed}-collectors-${day}-${location}`))
    const rareTargets = market
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.item.rarity === "rare" || entry.item.rarity === "legendary")
      .sort(() => rng() - 0.5)
      .slice(0, 2)
    const targetIndices = new Set(rareTargets.map((entry) => entry.index))
    return market.map((item, index) => {
      if (!targetIndices.has(index)) return item
      const discount = Math.round(item.basePrice * (0.75 + rng() * 0.1))
      return {
        ...item,
        priceToday: discount,
        trend: "down" as const,
        flavorText: `Soft market: ${item.flavorText}`,
      }
    })
  }

  if (shift.id === "audit_nerves") {
    // Sellers get nervous: fewer clean deals, and high-end listings demand a premium.
    const rng = mulberry32(hashSeed(`${runSeed}-audit-${day}-${location}`))
    const targets = market
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.item.rarity === "rare" || entry.item.rarity === "legendary")
      .sort(() => rng() - 0.5)
      .slice(0, 2)
    const targetIndices = new Set(targets.map((entry) => entry.index))
    return market.map((item, index) => {
      if (!targetIndices.has(index)) return item
      const premium = Math.max(item.priceToday, Math.round(item.basePrice * (1.05 + rng() * 0.2)))
      return {
        ...item,
        priceToday: premium,
        trend: "up" as const,
        flavorText: `Audit premium: ${item.flavorText}`,
      }
    })
  }

  return market
}

const getMarketRecap = (market: MarketItem[]) => {
  const totals = market.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1
      acc[item.trend] = (acc[item.trend] ?? 0) + 1
      return acc
    },
    {
      Guitar: 0,
      Amp: 0,
      Pedal: 0,
      Parts: 0,
      up: 0,
      down: 0,
      stable: 0,
    } as Record<string, number>
  )
  const trend =
    totals.up > totals.down ? "trending up" : totals.down > totals.up ? "trending down" : "steady"
  return `Market recap: ${market.length} listings. G:${totals.Guitar} A:${totals.Amp} P:${totals.Pedal} Parts:${totals.Parts}. Prices ${trend}.`
}

const getRepoMessage = (day: number, location: string, runSeed: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-repo-${day}-${location}`))
  return repoMessages[Math.floor(rng() * repoMessages.length)]
}

const resolvePlayerAuction = (params: {
  runSeed: string
  day: number
  location: string
  item: OwnedItem
}) => {
  const { runSeed, day, location, item } = params
  const rng = mulberry32(hashSeed(`${runSeed}-player-auction-${day}-${location}-${item.id}`))
  // Casino-spicy distribution: can go low, can go wildly high.
  const base = 0.35 + rng() * 1.4 // 35%–175%
  const spike = rng() < 0.25 ? 0.4 + rng() * 1.6 : 0 // +40%–+200% (25% chance)
  const multiplier = base + spike
  const baseline = Math.max(30, Math.round(item.auctionBaselinePrice ?? item.basePrice))
  const hammer = Math.max(50, Math.round(baseline * multiplier))
  const premiumRate = item.auctionBuyerPremiumRate ?? PLAYER_AUCTION_BUYER_PREMIUM_RATE
  const buyerPremium = Math.round(hammer * premiumRate)
  const totalPaid = hammer + buyerPremium
  return { hammer, buyerPremium, totalPaid }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const computeHeatLevel = (inventory: OwnedItem[]): HeatLevel => {
  const totalHeat = inventory.reduce((sum, item) => sum + item.heatValue, 0)
  if (totalHeat >= 70) return "High"
  if (totalHeat >= 30) return "Medium"
  return "Low"
}

const computeSlotsUsed = (inventory: OwnedItem[]) =>
  inventory.reduce((sum, item) => sum + item.slots, 0)

const getTrustTier = (scamRisk: number, reputation: number, isInspected = false) => {
  const proofBonus = isInspected ? 0.1 : 0
  const adjustedRisk = clamp(scamRisk - reputation * 0.002 - proofBonus, 0, 1)
  if (adjustedRisk < 0.15) return "Verified"
  if (adjustedRisk < 0.3) return "Mixed"
  return "Sketchy"
}

const getSellPrice = (item: OwnedItem, market: MarketItem[], reputation: number) => {
  const match = market.find((marketItem) => marketItem.name === item.name)
  const basePrice = match?.priceToday ?? item.basePrice
  const repBonus = Math.min(0.2, reputation / 200)
  const conditionFactor = conditionMultiplier[item.condition]
  return Math.max(
    30,
    Math.round(basePrice * (0.85 + repBonus) * conditionFactor * item.authMultiplier)
  )
}

const getAuthCost = (item: OwnedItem) => Math.max(60, Math.round(item.basePrice * 0.08))

const getInsuranceCost = (price: number) => Math.max(20, Math.round(price * 0.06))

const isSmokingDeal = (item: MarketItem) => item.priceToday < item.basePrice * 0.75

const getLuthierCost = (item: OwnedItem, target: Condition) => {
  if (target === "Player") return Math.max(80, Math.round(item.basePrice * 0.05))
  return Math.max(180, Math.round(item.basePrice * 0.12))
}

const getLuthierDays = (target: Condition) => (target === "Player" ? 1 : 2)

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const buildVagueItems = (count: number) => {
  const pool = [...vagueDescriptors]
  const picks: string[] = []
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) break
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return picks
}

const pickBulkLotItems = (runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-bulk-${day}-${location}`))
  const count = 3 + Math.floor(rng() * 4)
  const pool = [...marketCatalog]
  const picks: MarketItem[] = []
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(rng() * pool.length)
    const base = pool.splice(index, 1)[0]
    const condition = rng() < 0.5 ? "Project" : "Player"
    const priceToday = Math.round(base.basePrice * 0.6)
    const slots = base.category === "Amp" ? 3 : base.category === "Guitar" ? 2 : 1
    picks.push({
      id: buildMarketId(`${base.name}-bulk`, day, location, i),
      name: base.name,
      category: base.category,
      basePrice: base.basePrice,
      priceToday,
      trend: "down",
      rarity: base.rarity,
      condition,
      slots,
      scamRisk: base.scamRisk,
      hotRisk: base.hotRisk,
      description: base.description,
      flavorText: `Bulk lot find: ${base.flavorText}`,
    })
  }
  return picks
}

const buildMysteriousListing = (runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-mystery-${day}-${location}`))
  const rarePool = marketCatalog.filter((item) => item.rarity === "rare" || item.rarity === "legendary")
  const base = randomFrom(rarePool.length ? rarePool : marketCatalog)
  const condition = "Player" as Condition
  const priceToday = Math.round(base.basePrice * 0.55)
  const slots = base.category === "Amp" ? 3 : base.category === "Guitar" ? 2 : 1
  return {
    id: buildMarketId(`${base.name}-mystery`, day, location, Math.floor(rng() * 1000)),
    name: base.name,
    category: base.category,
    basePrice: base.basePrice,
    priceToday,
    trend: "down" as const,
    rarity: base.rarity,
    condition,
    slots,
    scamRisk: clamp(base.scamRisk + 0.25, 0.2, 0.9),
    hotRisk: base.hotRisk,
    description: `Too-good-to-be-true listing: ${base.description}`,
    flavorText: "The photos look legit, but the price is unreal.",
  } satisfies MarketItem
}

const buildSpecialListingFromPool = (
  pool: typeof marketCatalog,
  day: number,
  location: string,
  runSeed: string,
  tag: string,
  variant = 0
) => {
  if (pool.length === 0) return null
  const rng = mulberry32(hashSeed(`${runSeed}-intro-${tag}-${day}-${location}-${variant}`))
  const baseItem = pool[Math.floor(rng() * pool.length)]
  const condition = tag === "festival_weekend" || tag === "parts_flood" ? ("Player" as Condition) : ("Mint" as Condition)
  const priceFactor = tag === "festival_weekend" ? 0.86 : tag === "parts_flood" ? 0.72 : 0.78
  const priceToday = Math.round(baseItem.basePrice * priceFactor * conditionMultiplier[condition])
  const slots = baseItem.category === "Amp" ? 3 : baseItem.category === "Guitar" ? 2 : 1
  return {
    id: buildMarketId(`${baseItem.name}-intro`, day, location, Math.floor(rng() * 1000)),
    name: baseItem.name,
    category: baseItem.category,
    basePrice: baseItem.basePrice,
    priceToday,
    trend: "down" as const,
    rarity: baseItem.rarity,
    condition,
    slots,
    scamRisk:
      tag === "parts_flood"
        ? clamp(baseItem.scamRisk + 0.18, 0.08, 0.9)
        : Math.max(0.04, baseItem.scamRisk - 0.1),
    hotRisk: baseItem.hotRisk,
    description: baseItem.description,
    flavorText:
      tag === "festival_weekend"
        ? `Festival weekend listing: ${baseItem.flavorText}`
        : tag === "parts_flood"
          ? `Flood listing: ${baseItem.flavorText}`
          : `Special lead: ${baseItem.flavorText}`,
  } satisfies MarketItem
}

const createRunSeed = () => {
  if (typeof crypto !== "undefined") {
    if ("randomUUID" in crypto) return crypto.randomUUID()
    if ("getRandomValues" in crypto) {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    }
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const MAX_INTRO_MARKET_CONDITIONS = 2
const MAX_DAILY_MARKET_CONDITIONS = 2

const pickIntroBundle = (runSeed: string, day: number, location: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-intro-${day}-${location}`))
  const pool = [...introMessagePool]
  const shuffled: typeof introMessagePool = []
  while (pool.length) {
    const index = Math.floor(rng() * pool.length)
    shuffled.push(pool.splice(index, 1)[0])
  }
  const intro = shuffled.slice(0, MAX_INTRO_MARKET_CONDITIONS)
  const messages: TerminalMessage[] = [
    { id: `${runSeed}-intro-0`, text: "Welcome to Fret Wars. The gear market awaits.", type: "info" },
    ...intro.map((message, index) => ({
      id: `${runSeed}-intro-${index + 1}`,
      text: message.text,
      type: message.type,
    })),
  ]

  const specialListings: MarketItem[] = []
  intro.forEach((message) => {
    if (!message.listingTag) return
    let pool: typeof marketCatalog = []
    switch (message.listingTag) {
      case "vintage_fender":
        pool = marketCatalog.filter(
          (item) =>
            item.category === "Guitar" &&
            (item.name.includes("Fender") ||
              item.name.includes("Strat") ||
              item.name.includes("Jazzmaster") ||
              item.name.includes("Tele"))
        )
        break
      case "touring_band":
        pool = marketCatalog.filter((item) => item.category === "Amp" || item.category === "Parts")
        break
      case "pedal_hype":
        pool = marketCatalog.filter((item) => item.category === "Pedal" && item.rarity !== "common")
        break
      case "pickup_batch":
        pool = marketCatalog.filter((item) => item.category === "Parts" && item.name.includes("Pickup"))
        break
      case "studio_dump":
        pool = marketCatalog.filter((item) => item.category === "Amp" || item.category === "Pedal")
        break
      case "festival_weekend":
        pool = marketCatalog.filter((item) => item.category === "Pedal" || item.category === "Parts")
        break
      case "parts_flood":
        pool = marketCatalog.filter((item) => item.category === "Parts")
        break
    }
    const variants = message.listingTag === "festival_weekend" ? 2 : 1
    for (let v = 0; v < variants; v += 1) {
      const listing = buildSpecialListingFromPool(pool, day, location, runSeed, message.listingTag, v)
      if (listing) specialListings.push(listing)
    }
  })

  return { messages, specialListings }
}

const buildSpecialListing = (day: number, location: string) => {
  const rarePool = marketCatalog.filter((item) => item.rarity === "rare" || item.rarity === "legendary")
  const baseItem = randomFrom(rarePool.length ? rarePool : marketCatalog)
  const condition = "Mint" as Condition
  const priceToday = Math.round(baseItem.basePrice * 0.72)
  const slots = baseItem.category === "Amp" ? 3 : baseItem.category === "Guitar" ? 2 : 1
  return {
    id: buildMarketId(`${baseItem.name}-special`, day, location, Math.floor(Math.random() * 1000)),
    name: baseItem.name,
    category: baseItem.category,
    basePrice: baseItem.basePrice,
    priceToday,
    trend: "down" as const,
    rarity: baseItem.rarity,
    condition,
    slots,
    scamRisk: Math.max(0.05, baseItem.scamRisk - 0.1),
    hotRisk: baseItem.hotRisk,
    description: baseItem.description,
    flavorText: `Special listing: ${baseItem.flavorText}`,
  } satisfies MarketItem
}

const buildWonItem = (day: number) => {
  const winPool = marketCatalog.filter((item) => item.rarity !== "legendary")
  const baseItem = randomFrom(winPool.length ? winPool : marketCatalog)
  const condition = "Player" as Condition
  const slots = baseItem.category === "Amp" ? 3 : baseItem.category === "Guitar" ? 2 : 1
  return {
    id: buildMarketId(`${baseItem.name}-won`, day, "duel", Math.floor(Math.random() * 1000)),
    name: baseItem.name,
    category: baseItem.category,
    basePrice: baseItem.basePrice,
    priceToday: baseItem.basePrice,
    trend: "stable" as const,
    rarity: baseItem.rarity,
    condition,
    slots,
    scamRisk: baseItem.scamRisk,
    hotRisk: Math.max(0.05, baseItem.hotRisk - 0.05),
    description: baseItem.description,
    flavorText: `Won in a jam: ${baseItem.flavorText}`,
  } satisfies MarketItem
}

const calculateScore = (cash: number, inventory: OwnedItem[], market: MarketItem[], reputation: number) => {
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + getSellPrice(item, market, reputation),
    0
  )
  return Math.round(cash + inventoryValue + reputation * 50)
}

const createMessage = (
  text: string,
  type: TerminalMessage["type"] = "info",
  isArt = false
): TerminalMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  text,
  type,
  isArt,
})

const ASCII_ART = {
  travel: `        ___
   ____/   \\____
  |  ~  GEAR  ~ |===]
  '--|------|--'
     o      o`,
  duelChallenge: `       __
      /  \\
     |    |
     |    |
    /|    |\\
   / |====| \\
  |  '----'  |
   \\________/`,
  duelWin: `  ~ ~ ~ ENCORE ~ ~ ~`,
  duelLose: `  ~ . . . ~
  (silence)`,
  bulkLot: `   _________
  |  STORAGE |
  |  UNIT #7 |
  |__________|
  ||      ||`,
  tradeOffer: `  <=> SWAP <=>`,
  mysteriousListing: `  +----------+
  |  ? ? ?   |
  |  $ LOW   |
  +----------+`,
  repairScare: `  -- is that a crack? --`,
  theft: `   ____  ____\n  / __ \\/ __ \\\n / /_/ / /_/ /\n/ ____/ ____/\n/_/   /_/ \n  CAR HIT`,
  repo: `  +----------+
  | SERIAL # |
  | CHECKING |
  +----------+`,
  pawnDeal: `  $ $ $ CLEARANCE $ $ $`,
  hype: `  ^^^ TRENDING ^^^`,
  estate: `  +----------------+
  |  ESTATE SALE   |
  |  Everything    |
  |  Must Go       |
  +----------------+`,
  collectorsQuiet: `  . . . crickets . . .`,
  scam: `  \\_( :/ )_/
  Listing vanishes.`,
  auctionHammer: `   _..----.._
 .'  HAMMER  '.
 |  DOWN!     |
 '._        _.'
    '------'`,
  endRun: `  +========================+
  |      FRET WARS         |
  |      RUN COMPLETE      |
  +========================+`,
}

const createInitialGameState = (runSeed: string, totalDays = 21): GameState => {
  const intro = pickIntroBundle(runSeed, 1, "Downtown Music Row")
  const baseMarket = generateMarket(1, "Downtown Music Row", runSeed)
  return {
    day: 1,
    totalDays,
    location: "Downtown Music Row",
    cash: 3000,
    bagTier: 0,
    inventoryCapacity: getBagCapacity(0),
    inventory: [],
    reputation: 60,
    heatLevel: "Low",
    inspectedMarketIds: [],
    recentFlipDays: [],
    isGameOver: false,
    bestFlip: undefined,
    rarestSold: undefined,
    tools: {
      serialScanner: false,
      priceGuide: false,
      insurancePlan: false,
      luthierBench: false,
    },
    pendingDuel: null,
    pendingEncounter: null,
    tradeDeclines: 0,
    performanceMarket: generatePerformanceMarket(1, "Downtown Music Row", runSeed),
    performanceItems: [],
    market: [...baseMarket, ...intro.specialListings],
    messages: intro.messages,
    creditLine: {
      frozen: false,
      loan: null,
    },
    runSeed,
  }
}

export default function FretWarsGame() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(createRunSeed()))
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [insuranceSelected, setInsuranceSelected] = useState(false)
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [playerAuctionItemId, setPlayerAuctionItemId] = useState<string | null>(null)
  const [playerAuctionBaseline, setPlayerAuctionBaseline] = useState<number>(0)
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false)
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle")
  const [scorePostStatus, setScorePostStatus] = useState<
    | { state: "idle" }
    | { state: "posting" }
    | { state: "posted"; id: string; eligible: boolean }
    | { state: "error"; message: string }
  >({ state: "idle" })
  const [scorePostName, setScorePostName] = useState("")
  const [scorePostEmail, setScorePostEmail] = useState("")
  const [scorePostOptIn, setScorePostOptIn] = useState(false)
  const [showStartMenu, setShowStartMenu] = useState(true)
  const [hasSavedGame, setHasSavedGame] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [runLength, setRunLength] = useState(21)
  const gameStateRef = useRef<GameState>(gameState)
  const trackedRunCompleteRef = useRef<string | null>(null)
  const trackedEncounterKeyRef = useRef<string | null>(null)
  const trackedDuelKeyRef = useRef<string | null>(null)
  const lastAskProofToastRef = useRef<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalExpandedRef = useRef<HTMLDivElement>(null)
  const expandedAutoScrollRef = useRef(true)
  const marketMobileScrollRef = useRef<HTMLDivElement>(null)
  const didHydrateRef = useRef(false)
  const autoScrollRef = useRef(true)
  const isMobile = useIsMobile()
  const lastLocationRef = useRef(gameState.location)
  const isSelectedInspected = selectedItem
    ? gameState.inspectedMarketIds.includes(selectedItem.id)
    : false

  const addMessage = (text: string, type: TerminalMessage["type"] = "info") => {
    const newMessage = createMessage(text, type)
    setGameState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }))
  }

  const openPlayerAuction = (item: OwnedItem) => {
    const baseline = getSellPrice(item, gameState.market, gameState.reputation)
    setPlayerAuctionItemId(item.id)
    setPlayerAuctionBaseline(baseline)
  }

  const closePlayerAuction = () => {
    setPlayerAuctionItemId(null)
    setPlayerAuctionBaseline(0)
  }

  const handleConfirmPlayerAuction = () => {
    if (!playerAuctionItemId) return
    setGameState((prev) => {
      const item = prev.inventory.find((owned) => owned.id === playerAuctionItemId)
      if (!item) return prev
      if (item.rarity !== "legendary") {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Only legendary items can be listed on StringTree right now.", "info")],
        }
      }
      if (item.authStatus === "pending" || item.luthierStatus === "pending") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage("Finish your pending work before listing this item.", "info"),
          ],
        }
      }
      if (item.auctionStatus === "listed") {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("That item is already listed on StringTree.", "info")],
        }
      }
      const baseline = getSellPrice(item, prev.market, prev.reputation)
      const resolveDay = prev.day + 1
      const nextInventory = prev.inventory.map((owned) =>
        owned.id === item.id
          ? {
              ...owned,
              auctionStatus: "listed" as const,
              auctionListedDay: prev.day,
              auctionResolveDay: resolveDay,
              auctionBuyerPremiumRate: PLAYER_AUCTION_BUYER_PREMIUM_RATE,
              auctionBaselinePrice: baseline,
            }
          : owned
      )
      return {
        ...prev,
        inventory: nextInventory,
        messages: [
          ...prev.messages,
          createMessage("StringTree auction is live. The room will decide tomorrow.", "event"),
          createMessage(`Buyer premium: 5%. Resolves Day ${resolveDay}.`, "info"),
        ],
      }
    })
    closePlayerAuction()
  }

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    setRunContext({ runSeed: gameState.runSeed, totalDays: gameState.totalDays })
    return () => clearRunContext()
  }, [gameState.runSeed, gameState.totalDays])

  useEffect(() => {
    if (!gameState.isGameOver) return
    if (trackedRunCompleteRef.current === gameState.runSeed) return
    trackedRunCompleteRef.current = gameState.runSeed
    const score = calculateScore(gameState.cash, gameState.inventory, gameState.market, gameState.reputation)
    track("run_complete", {
      runSeed: gameState.runSeed,
      day: gameState.day,
      totalDays: gameState.totalDays,
      score,
      cash: gameState.cash,
      reputation: gameState.reputation,
      inventorySlotsUsed: computeSlotsUsed(gameState.inventory),
      inventoryCapacity: gameState.inventoryCapacity,
    })
  }, [
    gameState.isGameOver,
    gameState.runSeed,
    gameState.day,
    gameState.totalDays,
    gameState.cash,
    gameState.reputation,
    gameState.inventory,
    gameState.inventoryCapacity,
    gameState.market,
  ])

  useEffect(() => {
    const encounter = gameState.pendingEncounter
    if (!encounter) return
    const key =
      encounter.type === "auction"
        ? `auction-${gameState.day}-${gameState.location}-${encounter.item.id}`
        : `${encounter.type}-${gameState.day}-${gameState.location}`
    if (trackedEncounterKeyRef.current === key) return
    trackedEncounterKeyRef.current = key
    track("encounter_open", {
      runSeed: gameState.runSeed,
      type: encounter.type,
      day: gameState.day,
      location: gameState.location,
      ...(encounter.type === "auction"
        ? { itemCategory: encounter.item.category, rarity: encounter.item.rarity, startingBid: encounter.startingBid }
        : {}),
    })
  }, [gameState.pendingEncounter, gameState.day, gameState.location, gameState.runSeed])

  useEffect(() => {
    const duel = gameState.pendingDuel
    if (!duel) return
    const key = `duel-${gameState.day}-${gameState.location}-${duel.challengerId}-${duel.round}`
    if (trackedDuelKeyRef.current === key) return
    trackedDuelKeyRef.current = key
    if (duel.round === 1) {
      track("duel_start", {
        runSeed: gameState.runSeed,
        day: gameState.day,
        location: gameState.location,
        challengerId: duel.challengerId,
        totalRounds: duel.totalRounds,
      })
    }
  }, [gameState.pendingDuel, gameState.day, gameState.location, gameState.runSeed])

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      setHasSavedGame(true)
      try {
        const parsed = JSON.parse(savedState) as Partial<GameState>
        const fallback = createInitialGameState("seed")
        const merged = { ...fallback, ...parsed }
        setRunLength(
          typeof merged.totalDays === "number"
            ? Math.max(7, Math.min(90, Math.round(merged.totalDays)))
            : 21
        )
        const inferredBagTier = (parsed.bagTier ?? inferBagTier(merged.inventoryCapacity ?? fallback.inventoryCapacity)) as BagTier
        const normalizedInventory = (parsed.inventory ?? fallback.inventory).map((item) => ({
          ...item,
          condition: item.condition ?? "Player",
          rarity: item.rarity ?? "common",
          slots:
            item.slots ??
            (item.category === "Amp" ? 3 : item.category === "Guitar" ? 2 : 1),
          auctionStatus: item.auctionStatus ?? "none",
          authStatus: item.authStatus ?? "none",
          authMultiplier: item.authMultiplier ?? 1,
          insured: item.insured ?? false,
          insurancePaid: item.insurancePaid ?? 0,
          luthierStatus: item.luthierStatus ?? "none",
        }))
        const marketHasDetails = parsed.market?.every((item) => item.condition && item.slots && item.rarity)
        setGameState({
          ...merged,
          bagTier: inferredBagTier,
          inventoryCapacity: getBagCapacity(inferredBagTier),
          inventory: normalizedInventory,
          market:
            marketHasDetails && parsed.market
              ? parsed.market
              : generateMarket(merged.day, merged.location, merged.runSeed),
          performanceMarket:
            parsed.performanceMarket ??
            generatePerformanceMarket(merged.day, merged.location, merged.runSeed),
          performanceItems: parsed.performanceItems ?? fallback.performanceItems,
          messages: parsed.messages ?? fallback.messages,
          inspectedMarketIds: parsed.inspectedMarketIds ?? fallback.inspectedMarketIds,
          recentFlipDays: parsed.recentFlipDays ?? fallback.recentFlipDays,
          isGameOver: parsed.isGameOver ?? fallback.isGameOver,
          bestFlip: parsed.bestFlip ?? fallback.bestFlip,
          rarestSold: parsed.rarestSold ?? fallback.rarestSold,
          tools: parsed.tools ?? fallback.tools,
          pendingDuel: parsed.pendingDuel ?? fallback.pendingDuel,
          pendingEncounter: parsed.pendingEncounter ?? fallback.pendingEncounter,
          tradeDeclines: parsed.tradeDeclines ?? fallback.tradeDeclines,
          creditLine: {
            frozen: parsed.creditLine?.frozen ?? fallback.creditLine.frozen,
            loan: parsed.creditLine?.loan ?? fallback.creditLine.loan,
          },
        })
      } catch {
        setGameState(createInitialGameState(createRunSeed()))
      }
    } else {
      setGameState(createInitialGameState(createRunSeed(), runLength))
      setHasSavedGame(false)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  useEffect(() => {
    // When traveling to a new location, reset mobile market scroll to the top.
    if (!isMobile) return
    if (lastLocationRef.current === gameState.location) return
    lastLocationRef.current = gameState.location
    requestAnimationFrame(() => {
      marketMobileScrollRef.current?.scrollTo({ top: 0 })
    })
  }, [gameState.location, isMobile])

  const handleTerminalScroll = () => {
    if (!terminalRef.current) return
    const el = terminalRef.current
    if (isMobile) {
      // Mobile nested scrolling is finicky; keep terminal pinned to latest.
      autoScrollRef.current = true
      return
    }
    const remaining = Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight)
    autoScrollRef.current = remaining < 80
  }

  useEffect(() => {
    if (!terminalRef.current) return
    const el = terminalRef.current
    if (isMobile || !didHydrateRef.current || autoScrollRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
      didHydrateRef.current = true
    }
  }, [gameState.messages, isMobile])

  const handleExpandedTerminalScroll = () => {
    const el = terminalExpandedRef.current
    if (!el) return
    const remaining = Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight)
    expandedAutoScrollRef.current = remaining < 80
  }

  const scrollExpandedTerminalToBottom = () => {
    const el = terminalExpandedRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    if (!isTerminalExpanded) return
    // Radix Dialog content mounts via a portal; ensure the ref exists before scrolling.
    const t = window.setTimeout(() => {
      requestAnimationFrame(() => {
        scrollExpandedTerminalToBottom()
        requestAnimationFrame(scrollExpandedTerminalToBottom)
      })
    }, 0)
    return () => window.clearTimeout(t)
  }, [isTerminalExpanded])

  useEffect(() => {
    if (!isTerminalExpanded) return
    if (!expandedAutoScrollRef.current) return
    requestAnimationFrame(() => {
      scrollExpandedTerminalToBottom()
    })
  }, [gameState.messages, isTerminalExpanded])

  const handleAction = (action: string) => {
    switch (action) {
      case "travel":
        track("action", { runSeed: gameState.runSeed, type: "travel", day: gameState.day, location: gameState.location })
        setIsTravelModalOpen(true)
        break
      case "gigbag":
        track("action", { runSeed: gameState.runSeed, type: "gigbag", day: gameState.day, location: gameState.location })
        setIsInventoryModalOpen(true)
        break
      case "sell":
        track("action", { runSeed: gameState.runSeed, type: "sell", day: gameState.day, location: gameState.location })
        setIsSellModalOpen(true)
        break
      case "endday":
        track("end_day", { runSeed: gameState.runSeed, day: gameState.day, location: gameState.location })
        setGameState((prev) =>
          advanceDay(prev, prev.location, [
            createMessage("You crash in town and wait for tomorrow's listings.", "info"),
          ])
        )
        break
    }
  }

  const handleItemSelect = (item: MarketItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
    setInsuranceSelected(false)
    track("market_item_open", {
      runSeed: gameState.runSeed,
      day: gameState.day,
      location: gameState.location,
      itemCategory: item.category,
      rarity: item.rarity,
      priceToday: item.priceToday,
      basePrice: item.basePrice,
    })
  }

  const handleBuy = () => {
    if (!selectedItem) return
    const isInspected = gameState.inspectedMarketIds.includes(selectedItem.id)
    const slotsUsed = computeSlotsUsed(gameState.inventory)
    if (slotsUsed + selectedItem.slots > gameState.inventoryCapacity) {
      addMessage("No inventory space left. Clear a slot first.", "warning")
      return
    }
    if (insuranceSelected && !gameState.tools.insurancePlan) {
      addMessage("Insurance plan required to insure this deal.", "warning")
      return
    }

    const insuranceCost = insuranceSelected ? getInsuranceCost(selectedItem.priceToday) : 0
    const totalCost = selectedItem.priceToday + insuranceCost

    if (gameState.cash >= totalCost) {
      const effectiveScamRisk = clamp(
        selectedItem.scamRisk -
          (isInspected ? 0.2 : 0) -
          gameState.reputation * 0.001 -
          (gameState.tools.serialScanner ? 0.05 : 0) -
          (gameState.tools.priceGuide ? 0.03 : 0),
        0,
        0.9
      )
      if (Math.random() < effectiveScamRisk) {
        const refund = insuranceSelected ? Math.round(selectedItem.priceToday * 0.6) : 0
        track("buy_scammed", {
          runSeed: gameState.runSeed,
          day: gameState.day,
          location: gameState.location,
          itemCategory: selectedItem.category,
          rarity: selectedItem.rarity,
          priceToday: selectedItem.priceToday,
          insured: insuranceSelected,
          refund,
        })
        setGameState((prev) => ({
          ...prev,
          cash: Math.max(0, prev.cash - totalCost + refund),
          reputation: clamp(prev.reputation - 6, 0, 100),
          market: prev.market.filter((item) => item.id !== selectedItem.id),
          inspectedMarketIds: prev.inspectedMarketIds.filter((id) => id !== selectedItem.id),
          messages: [
            ...prev.messages,
            createMessage(ASCII_ART.scam, "warning", true),
            createMessage(
              insuranceSelected
                ? `Listing vanishes on the ${selectedItem.name}. Insurance reimburses $${refund}.`
                : `Listing vanishes on the ${selectedItem.name}. Your cash is gone.`,
              "warning"
            ),
          ],
        }))
        setIsModalOpen(false)
        setSelectedItem(null)
        return
      }
      const ownedItem: OwnedItem = {
        ...selectedItem,
        purchasePrice: selectedItem.priceToday,
        heatValue: Math.round(selectedItem.hotRisk * 100),
        acquiredDay: gameState.day,
        auctionStatus: "none",
        inspected: false,
        authStatus: "none",
        authMultiplier: 1,
        insured: insuranceSelected,
        insurancePaid: insuranceCost,
        luthierStatus: "none",
      }
      setGameState((prev) => ({
        ...prev,
        cash: prev.cash - totalCost,
        inventory: [...prev.inventory, ownedItem],
        heatLevel: computeHeatLevel([...prev.inventory, ownedItem]),
        market: prev.market.filter((item) => item.id !== selectedItem.id),
        inspectedMarketIds: prev.inspectedMarketIds.filter((id) => id !== selectedItem.id),
      }))
      track("buy_success", {
        runSeed: gameState.runSeed,
        day: gameState.day,
        location: gameState.location,
        itemCategory: selectedItem.category,
        rarity: selectedItem.rarity,
        priceToday: selectedItem.priceToday,
        insured: insuranceSelected,
        insuranceCost,
      })
      addMessage(
        insuranceSelected
          ? `Purchased ${selectedItem.name} for $${selectedItem.priceToday} + $${insuranceCost} insurance.`
          : `Purchased ${selectedItem.name} for $${selectedItem.priceToday}.`,
        "success"
      )
      setIsModalOpen(false)
      setSelectedItem(null)
    } else {
      addMessage("Not enough cash for this listing.", "warning")
    }
  }

  const handleAskProof = () => {
    if (!selectedItem) return
    const snapshot = gameStateRef.current
    const actionKey = `${snapshot.runSeed}-${snapshot.day}-${selectedItem.id}`
    let toastTitle: string | null = null
    let toastDescription: string | undefined
    let toastVariant: "default" | "destructive" | undefined
    setGameState((prev) => {
      if (prev.inspectedMarketIds.includes(selectedItem.id)) {
        toastTitle = "Proof already checked"
        toastDescription = "You already pushed for proof on this listing."
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage("You've already pushed for proof on this one.", "info"),
          ],
        }
      }
      const walkChance = clamp(0.2 + selectedItem.scamRisk * 0.3 - prev.reputation * 0.002, 0.05, 0.45)
      if (Math.random() < walkChance) {
        toastTitle = "Seller walked"
        toastDescription = "They pulled the listing when you asked for proof."
        toastVariant = "destructive"
        return {
          ...prev,
          market: prev.market.filter((item) => item.id !== selectedItem.id),
          messages: [
            ...prev.messages,
            createMessage("You ask for proof. The seller goes dark and pulls the listing.", "warning"),
          ],
        }
      }
      const repChange = selectedItem.scamRisk < 0.15 ? -1 : selectedItem.scamRisk >= 0.35 ? 1 : 0
      toastTitle = "Proof checked"
      toastDescription =
        repChange === 1
          ? "You get a clearer read. Rep +1."
          : repChange === -1
            ? "You get a clearer read. Rep -1."
            : "You get a clearer read."
      return {
        ...prev,
        reputation: clamp(prev.reputation + repChange, 0, 100),
        inspectedMarketIds: [...prev.inspectedMarketIds, selectedItem.id],
        messages: [
          ...prev.messages,
          createMessage("You ask for proof. The seller sends a verification clip.", "info"),
          createMessage("You get a clearer read on the deal.", "event"),
          ...(repChange === -1
            ? [createMessage("Word spreads: you're thorough, maybe a bit picky.", "warning")]
            : repChange === 1
              ? [createMessage("Smart move. Your caution earns respect.", "success")]
              : []),
        ],
      }
    })

    if (toastTitle) {
      const toastKey = `${actionKey}-${toastTitle}`
      if (lastAskProofToastRef.current !== toastKey) {
        lastAskProofToastRef.current = toastKey
        toast({
          title: toastTitle,
          description: toastDescription,
          variant: toastVariant,
          duration: toastVariant === "destructive" ? 3000 : 2200,
        })
      }
    }
  }

  const handleWalkAway = () => {
    addMessage("You pass on the listing.", "info")
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const advanceDay = (
    prev: GameState,
    nextLocation: string,
    extraMessages: TerminalMessage[] = []
  ): GameState => {
    if (prev.day >= prev.totalDays) {
      const liquidationValue = prev.inventory.reduce(
        (sum, item) => sum + getSellPrice(item, prev.market, prev.reputation),
        0
      )
      const itemCount = prev.inventory.length
      const liquidationMessages: TerminalMessage[] =
        itemCount > 0
          ? [
              createMessage(
                `Run complete liquidation: sold ${itemCount} item${itemCount === 1 ? "" : "s"} for $${liquidationValue.toLocaleString()}.`,
                "success"
              ),
            ]
          : [createMessage("Run complete liquidation: no gear left in your bag.", "info")]
      return {
        ...prev,
        isGameOver: true,
        cash: prev.cash + liquidationValue,
        inventory: [],
        heatLevel: "Low",
        messages: [
          ...prev.messages,
          ...extraMessages,
          createMessage(ASCII_ART.endRun, "event", true),
          ...liquidationMessages,
          createMessage("Final day reached. Game over!", "warning"),
        ],
      }
    }
    const nextDay = prev.day + 1
    let nextMarket = generateMarket(nextDay, nextLocation, prev.runSeed)
    const nextPerformanceMarket = generatePerformanceMarket(nextDay, nextLocation, prev.runSeed)
    const shiftEvent = getMarketShiftEvent(nextDay, nextLocation, prev.runSeed)
    nextMarket = applyMarketShift(shiftEvent, nextMarket, prev.runSeed, nextDay, nextLocation)
    const recapMessage = getMarketRecap(nextMarket)
    const cleanedFlipDays = prev.recentFlipDays.filter((day) => nextDay - day <= 5)
    const totalHeat = prev.inventory.reduce((sum, item) => sum + item.heatValue, 0)
    const hotItems = prev.inventory.filter((item) => item.heatValue >= 40)
    const listedItems = prev.inventory.filter((item) => item.auctionStatus === "listed")
    const recentFlips = cleanedFlipDays.filter((day) => nextDay - day <= 3).length
    const repoRisk = clamp(
      0.05 +
        totalHeat * 0.002 +
        hotItems.length * 0.05 +
        listedItems.length * 0.08 +
        recentFlips * 0.06 -
        prev.reputation * 0.002,
      0,
      0.75
    )
    let nextInventory = prev.inventory
    let nextCash = prev.cash
    let nextReputation = prev.reputation
    let nextCreditLine = prev.creditLine
    let nextRecentFlipDays = cleanedFlipDays
    let nextBestFlip = prev.bestFlip
    let nextRarestSold = prev.rarestSold
    const repoMessages: TerminalMessage[] = []
    const authMessages: TerminalMessage[] = []
    const luthierMessages: TerminalMessage[] = []
    const auctionMessages: TerminalMessage[] = []
    const jamMessages: TerminalMessage[] = []
    const creditMessages: TerminalMessage[] = []
    let pendingDuel: DuelState | null = null
    let pendingEncounter: EncounterState | null = null

    if (nextCreditLine.loan && nextCreditLine.loan.balanceDue > 0) {
      const loan = nextCreditLine.loan
      const isPastDue = nextDay > loan.dueDay
      if (isPastDue) {
        let nextLoan = loan
        if (!loan.repPenaltyApplied) {
          nextReputation = clamp(nextReputation - 5, 0, 100)
          nextLoan = {
            ...loan,
            defaulted: true,
            repPenaltyApplied: true,
          }
          creditMessages.push(
            createMessage("Dealer Credit Line defaults. The bank freezes your credit.", "warning")
          )
          nextCreditLine = { ...nextCreditLine, frozen: true, loan: nextLoan }
        }

        const garnish = Math.min(nextLoan.balanceDue, Math.round(nextCash * CREDIT_GARNISH_RATE))
        if (garnish > 0) {
          nextCash = Math.max(0, nextCash - garnish)
          const remaining = Math.max(0, nextLoan.balanceDue - garnish)
          nextLoan = { ...nextLoan, balanceDue: remaining }
          nextCreditLine = { ...nextCreditLine, loan: nextLoan }
          creditMessages.push(
            createMessage(
              `Bank garnishes $${garnish.toLocaleString()} toward your overdue balance. Remaining: $${remaining.toLocaleString()}.`,
              "warning"
            )
          )
        }

        if (nextCreditLine.loan && nextCreditLine.loan.balanceDue <= 0) {
          creditMessages.push(createMessage("Debt cleared. Credit remains frozen this run.", "info"))
          nextCreditLine = { ...nextCreditLine, loan: null }
        }
      } else if (nextDay === loan.dueDay) {
        creditMessages.push(
          createMessage(
            `Dealer Credit Line payment is due today (Day ${loan.dueDay}). Balance: $${loan.balanceDue.toLocaleString()}.`,
            "warning"
          )
        )
      }
    }

    nextInventory = nextInventory.map((item) => {
      if (item.luthierStatus !== "pending" || !item.luthierReadyDay || item.luthierReadyDay > nextDay) {
        return item
      }
      const upgraded = item.luthierTargetCondition ?? item.condition
      luthierMessages.push(
        createMessage(
          `Luthier finishes ${item.name}. Condition improves to ${upgraded}.`,
          "success"
        )
      )
      return {
        ...item,
        condition: upgraded,
        luthierStatus: "complete",
        luthierReadyDay: undefined,
        luthierTargetCondition: undefined,
      }
    })

    nextInventory = nextInventory.map((item) => {
      if (item.authStatus !== "pending" || !item.authReadyDay || item.authReadyDay > nextDay) {
        return item
      }
      const outcome = item.authOutcome ?? "partial"
      if (outcome === "success") {
        authMessages.push(
          createMessage(`Authentication clears for ${item.name}. Buyers pay a premium.`, "success")
        )
        nextReputation = clamp(nextReputation + 1, 0, 100)
        return {
          ...item,
          authStatus: "success",
          authMultiplier: 1.08,
          heatValue: Math.max(0, item.heatValue - 40),
          authReadyDay: undefined,
          authOutcome: undefined,
        }
      }
      if (outcome === "fail") {
        authMessages.push(
          createMessage(`Authentication fails for ${item.name}. It sells at a discount.`, "warning")
        )
        nextReputation = clamp(nextReputation - 1, 0, 100)
        return {
          ...item,
          authStatus: "fail",
          authMultiplier: 0.9,
          authReadyDay: undefined,
          authOutcome: undefined,
        }
      }
      authMessages.push(
        createMessage(`Authentication returns mixed results for ${item.name}.`, "info")
      )
      return {
        ...item,
        authStatus: "partial",
        authMultiplier: 1,
        heatValue: Math.max(0, item.heatValue - 15),
        authReadyDay: undefined,
        authOutcome: undefined,
      }
    })

    const scannerReduction = prev.tools.serialScanner ? 0.08 : 0
    const finalRepoRisk = clamp(repoRisk - scannerReduction, 0, 0.75)
    if (hotItems.length > 0 && Math.random() < finalRepoRisk) {
      repoMessages.push(createMessage(ASCII_ART.repo, "warning", true))
      const hottest = [...hotItems].sort((a, b) => b.heatValue - a.heatValue)[0]
      nextInventory = nextInventory.filter((item) => item.id !== hottest.id)
      const fine = Math.max(80, Math.round(nextCash * 0.04))
      nextCash = Math.max(0, nextCash - fine)
      nextReputation = clamp(nextReputation - 8, 0, 100)
      if (hottest.insured) {
        const payout = Math.round(hottest.basePrice * 0.4)
        nextCash = nextCash + payout
        repoMessages.push(
          createMessage(getRepoMessage(nextDay, nextLocation, prev.runSeed), "warning"),
          createMessage(
            `Repo hit. ${hottest.name} is confiscated. Insurance pays $${payout}.`,
            "warning"
          )
        )
      } else {
        repoMessages.push(
          createMessage(getRepoMessage(nextDay, nextLocation, prev.runSeed), "warning"),
          createMessage(`Repo hit. ${hottest.name} is confiscated. You pay a $${fine} fine.`, "warning")
        )
      }
    }

    // Resolve any player-listed StringTree auctions (1-day delay).
    const resolvingListings = nextInventory.filter(
      (item) => item.auctionStatus === "listed" && item.auctionResolveDay && item.auctionResolveDay <= nextDay
    )
    if (resolvingListings.length > 0) {
      auctionMessages.push(createMessage(ASCII_ART.auctionHammer, "event", true))
      auctionMessages.push(createMessage("StringTree auction results roll in…", "event"))
      for (const listed of resolvingListings) {
        const { hammer, buyerPremium, totalPaid } = resolvePlayerAuction({
          runSeed: prev.runSeed,
          day: nextDay,
          location: nextLocation,
          item: listed,
        })
        // Sold (no reserves in v1).
        nextInventory = nextInventory.filter((item) => item.id !== listed.id)
        nextCash = nextCash + hammer
        nextRecentFlipDays = [...nextRecentFlipDays, nextDay].slice(-6)
        const profit = hammer - listed.purchasePrice
        nextBestFlip =
          profit > 0 && (!nextBestFlip || profit > nextBestFlip.profit)
            ? { name: listed.name, profit }
            : nextBestFlip
        nextRarestSold =
          !nextRarestSold || rarityRank[listed.rarity] > rarityRank[nextRarestSold.rarity]
            ? { name: listed.name, rarity: listed.rarity }
            : nextRarestSold
        auctionMessages.push(
          createMessage(
            `SOLD: ${listed.name} hammers at $${hammer.toLocaleString()} (+$${buyerPremium.toLocaleString()} buyer fee) = $${totalPaid.toLocaleString()}.`,
            "success"
          )
        )
      }
    }

    const jamChance = 0.18
    if (Math.random() < jamChance) {
      const challenger = randomFrom(duelChallengers)
      const options = [...duelOptions]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      const totalRounds = getDuelRounds(challenger.id)
      const baseWager = getDuelWagerAmount(challenger.id)
      const wagerAmount = Math.min(nextCash, baseWager)
      pendingDuel = {
        challengerId: challenger.id,
        challengerLabel: challenger.label,
        intro: randomFrom(challenger.intro),
        wagerAmount,
        options,
        round: 1,
        totalRounds,
        playerScore: 0,
        opponentScore: 0,
        selectedBoostId: undefined,
      }
      jamMessages.push(
        createMessage(ASCII_ART.duelChallenge, "event", true),
        createMessage(
          `${challenger.label} challenges you to a quick jam. Pick your approach.`,
          "event"
        )
      )
    }

    if (!pendingDuel && Math.random() < AUCTION_CHANCE) {
      const item = buildAuctionItem(prev.runSeed, nextDay, nextLocation)
      const startingBid = getAuctionStartingBid(item.basePrice, prev.runSeed, nextDay, nextLocation)
      pendingEncounter = {
        type: "auction",
        item,
        startingBid,
        buyerPremiumRate: AUCTION_BUYER_PREMIUM_RATE,
        minReputation: AUCTION_MIN_REPUTATION,
      }
      jamMessages.push(
        createMessage("StringTree Live Auction is live. Legendary lot on the block.", "event")
      )
    } else if (!pendingDuel && Math.random() < 0.22) {
      const encounterRoll = Math.random()
      if (encounterRoll < 0.32) {
        const items = pickBulkLotItems(prev.runSeed, nextDay, nextLocation)
        const slots = items.reduce((sum, item) => sum + item.slots, 0)
        const totalCost = Math.round(items.reduce((sum, item) => sum + item.priceToday, 0) * 0.75)
        pendingEncounter = {
          type: "bulkLot",
          items,
          vagueItems: buildVagueItems(items.length),
          totalCost,
          projectRate: 0.2 + Math.random() * 0.4,
        }
        jamMessages.push(
          createMessage(ASCII_ART.bulkLot, "event", true),
          createMessage("Lead on a storage unit full of gear. Bulk lot available.", "event")
        )
      } else if (encounterRoll < 0.6 && nextInventory.length > 0) {
        const requestedItem = randomFrom(nextInventory)
        const offered = buildSpecialListing(prev.day, prev.location)
        pendingEncounter = {
          type: "tradeOffer",
          requestedItem,
          offeredItem: offered,
        }
        jamMessages.push(
          createMessage(ASCII_ART.tradeOffer, "event", true),
          createMessage("A trader offers a swap if you're interested.", "event")
        )
      } else if (encounterRoll < 0.8) {
        const item = buildMysteriousListing(prev.runSeed, nextDay, nextLocation)
        pendingEncounter = {
          type: "mysteriousListing",
          item,
          proofChecked: false,
        }
        jamMessages.push(
          createMessage(ASCII_ART.mysteriousListing, "warning", true),
          createMessage("A too-good-to-be-true listing just hit your feed.", "warning")
        )
      }
    }

    return {
      ...prev,
      day: nextDay,
      location: nextLocation,
      market: nextMarket,
      performanceMarket: nextPerformanceMarket,
      cash: nextCash,
      reputation: nextReputation,
      inventory: nextInventory,
      bestFlip: nextBestFlip,
      rarestSold: nextRarestSold,
      creditLine: nextCreditLine,
      heatLevel: computeHeatLevel(nextInventory),
      inspectedMarketIds: [],
      recentFlipDays: nextRecentFlipDays,
      pendingDuel,
      pendingEncounter,
      messages: [
        ...prev.messages,
        ...extraMessages,
        createMessage(`--- Day ${nextDay} --- ${nextLocation} ---`, "event", true),
        createMessage(`Day ${nextDay} begins. New deals appear...`, "event"),
        ...[
          createMessage(shiftEvent.text, "event"),
          createMessage(recapMessage, "info"),
          ...(shiftEvent.id === "pawn_flush" ? [createMessage(ASCII_ART.pawnDeal, "event", true)] : []),
          ...(shiftEvent.id === "hype" ? [createMessage(ASCII_ART.hype, "event", true)] : []),
          ...(shiftEvent.id === "estate_glut" ? [createMessage(ASCII_ART.estate, "event", true)] : []),
          ...(shiftEvent.id === "collectors_quiet"
            ? [createMessage(ASCII_ART.collectorsQuiet, "info", true)]
            : []),
        ].slice(0, MAX_DAILY_MARKET_CONDITIONS),
        ...creditMessages,
        ...authMessages,
        ...luthierMessages,
        ...auctionMessages,
        ...jamMessages,
        ...repoMessages,
      ],
    }
  }

  const handleTravel = (location: Location) => {
    track("travel", {
      runSeed: gameState.runSeed,
      from: gameState.location,
      to: location.name,
      day: gameState.day,
      riskLevel: location.riskLevel,
      travelTimeHours: location.travelTime,
    })
    setGameState((prev) => {
      const theftMessages: TerminalMessage[] = []
      let travelInventory = prev.inventory
      let travelCash = prev.cash
      let travelRep = prev.reputation

      if (location.riskLevel === "High" && prev.inventory.length > 0) {
        const slotsUsed = computeSlotsUsed(prev.inventory)
        const tierBump = prev.bagTier === 2 ? 0.04 : prev.bagTier === 1 ? 0.02 : 0
        const theftChance = clamp(0.08 + slotsUsed * 0.012 - prev.reputation * 0.0008 + tierBump, 0.03, 0.26)
        if (Math.random() < theftChance) {
          // Prefer stealing valuable + portable items.
          const candidates = [...prev.inventory].sort(
            (a, b) =>
              (b.basePrice + b.purchasePrice + b.heatValue * 12 - b.slots * 250) -
              (a.basePrice + a.purchasePrice + a.heatValue * 12 - a.slots * 250)
          )
          const stolen = candidates[0]
          if (stolen) {
            travelInventory = prev.inventory.filter((item) => item.id !== stolen.id)
            travelRep = clamp(travelRep - 2, 0, 100)
            if (stolen.insured) {
              const payout = Math.max(0, Math.round(stolen.basePrice * 0.4))
              travelCash = travelCash + payout
              theftMessages.push(
                createMessage(ASCII_ART.theft, "warning", true),
                createMessage(
                  `Car break-in. ${stolen.name} is gone. Insurance pays $${payout}.`,
                  "warning"
                )
              )
            } else {
              theftMessages.push(
                createMessage(ASCII_ART.theft, "warning", true),
                createMessage(`Car break-in. ${stolen.name} is gone.`, "warning")
              )
            }
          }
        }
      }

      const arrivalMessage =
        location.riskLevel === "High"
          ? createMessage("You feel eyes on you as you arrive.", "warning")
          : location.riskLevel === "Medium"
            ? createMessage("The area seems quiet. For now.", "event")
            : createMessage("You arrive without incident.", "success")
      return advanceDay(
        { ...prev, inventory: travelInventory, cash: travelCash, reputation: travelRep },
        location.name,
        [
        createMessage(ASCII_ART.travel, "info", true),
        createMessage(`Traveling to ${location.name}... (${location.travelTime}h)`, "info"),
        ...theftMessages,
        arrivalMessage,
      ])
    })
    setIsTravelModalOpen(false)
  }

  const handleShare = async () => {
    const score = calculateScore(
      gameState.cash,
      gameState.inventory,
      gameState.market,
      gameState.reputation
    )
    const bestFlipLine = gameState.bestFlip
      ? `Best Flip: ${gameState.bestFlip.name} (+$${gameState.bestFlip.profit.toLocaleString()})`
      : "Best Flip: None"
    const rarestLine = gameState.rarestSold
      ? `Rarest Sold: ${gameState.rarestSold.name} (${gameState.rarestSold.rarity})`
      : "Rarest Sold: None"
    const summary = [
      "Fret Wars Results",
      `Day ${gameState.day}/${gameState.totalDays}`,
      `Net Worth: $${score.toLocaleString()}`,
      `Cash: $${gameState.cash.toLocaleString()}`,
      `Inventory Slots: ${computeSlotsUsed(gameState.inventory)}/${gameState.inventoryCapacity}`,
      `Reputation: ${gameState.reputation}`,
      bestFlipLine,
      rarestLine,
      "A StringTree Game",
    ].join("\n")

    try {
      await navigator.clipboard.writeText(summary)
      setShareStatus("copied")
    } catch {
      setShareStatus("error")
    }
  }

  const handlePostScore = async () => {
    if (scorePostStatus.state === "posting") return
    if (!gameState.isGameOver) return
    if (gameState.totalDays !== 21) {
      toast({
        title: "Standard run required",
        description: "Scores can only be posted for completed 21-day standard runs.",
        variant: "destructive",
        duration: 3200,
      })
      return
    }

    setScorePostStatus({ state: "posting" })
    try {
      const score = calculateScore(gameState.cash, gameState.inventory, gameState.market, gameState.reputation)
      const payload = {
        displayName: scorePostName.trim() || "Anonymous",
        score,
        runSeed: gameState.runSeed,
        day: gameState.day,
        totalDays: gameState.totalDays,
        completed: true,
        cash: gameState.cash,
        reputation: gameState.reputation,
        inventorySlotsUsed: computeSlotsUsed(gameState.inventory),
        inventoryCapacity: gameState.inventoryCapacity,
        bestFlip: gameState.bestFlip ?? undefined,
        rarestSold: gameState.rarestSold ?? undefined,
        email: scorePostEmail.trim() || undefined,
        emailOptIn: scorePostOptIn,
      }

      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => null)) as
        | null
        | { ok: true; id: string; eligible: boolean }
        | { ok: false; error?: string; detail?: string }

      if (!res.ok || !data || data.ok === false) {
        const detail = data && "detail" in data ? data.detail : undefined
        const err = data && "error" in data ? data.error : undefined
        const msg =
          err === "server_not_configured"
            ? "Score posting isn't configured yet (missing Supabase env vars)."
            : detail || "Unable to post score."
        setScorePostStatus({ state: "error", message: msg })
        toast({ title: "Score not posted", description: msg, variant: "destructive", duration: 3200 })
        return
      }

      setScorePostStatus({ state: "posted", id: data.id, eligible: data.eligible })
      toast({
        title: "Score posted",
        description: data.eligible ? "Eligible for leaderboards." : "Posted, but not eligible for Top boards.",
        duration: 3200,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setScorePostStatus({ state: "error", message: msg })
      toast({ title: "Score not posted", description: msg, variant: "destructive", duration: 3200 })
    }
  }

  const handleNewRun = () => {
    const fresh = createInitialGameState(createRunSeed(), runLength)
    trackedRunCompleteRef.current = null
    trackedEncounterKeyRef.current = null
    trackedDuelKeyRef.current = null
    track("run_start", {
      runSeed: fresh.runSeed,
      totalDays: fresh.totalDays,
      cash: fresh.cash,
      reputation: fresh.reputation,
      location: fresh.location,
      source: "new_game",
    })
    setGameState(fresh)
    setShareStatus("idle")
    setScorePostStatus({ state: "idle" })
    setScorePostName("")
    setScorePostEmail("")
    setScorePostOptIn(false)
    localStorage.removeItem(STORAGE_KEY)
    setHasSavedGame(false)
    setShowStartMenu(false)
    // On mobile, open the expanded terminal on first load so players see the intro
    // (and learn that it can be expanded).
    if (isMobile) {
      expandedAutoScrollRef.current = true
      setIsTerminalExpanded(true)
    }
  }

  const handleOpenMenu = () => {
    setShowStartMenu(true)
  }

  const resolveDuel = (option: DuelOption, accuracy = 0.5) => {
    track("duel_choice", {
      runSeed: gameState.runSeed,
      day: gameState.day,
      location: gameState.location,
      challengerId: gameState.pendingDuel?.challengerId,
      round: gameState.pendingDuel?.round,
      totalRounds: gameState.pendingDuel?.totalRounds,
      optionId: option.id,
      accuracy,
      usedBoost: Boolean(gameState.pendingDuel?.selectedBoostId),
    })
    setGameState((prev) => {
      if (!prev.pendingDuel) return prev
      const challenger = duelChallengers.find((item) => item.id === prev.pendingDuel?.challengerId)
      if (!challenger) return { ...prev, pendingDuel: null }

      const selectedBoost = prev.pendingDuel.selectedBoostId
        ? prev.performanceItems.find((item) => item.id === prev.pendingDuel?.selectedBoostId)
        : undefined
      const boostBonus = selectedBoost?.effect.playerBonus ?? 0
      const boostVariance = selectedBoost?.effect.varianceBonus ?? 0
      const boostRepBonus = selectedBoost?.effect.repBonusOnWin ?? 0
      const opponentPenalty = selectedBoost?.effect.opponentPenalty ?? 0

      const hasGuitar = prev.inventory.some((item) => item.category === "Guitar")
      const hasAmp = prev.inventory.some((item) => item.category === "Amp")
      const gearBonus = (hasGuitar ? 6 : 0) + (hasAmp ? 4 : 0)
      const heatPenalty = prev.heatLevel === "High" ? 10 : prev.heatLevel === "Medium" ? 5 : 0

      const clampedAccuracy = clamp(accuracy, 0, 1)
      const timingScale = 16 + prev.pendingDuel.round * 3 + (prev.pendingDuel.totalRounds - 1) * 2
      const timingBonus = (clampedAccuracy - 0.5) * timingScale
      const varianceScale = 1 - clampedAccuracy * 0.45

      const playerScore =
        prev.reputation * 0.4 +
        option.playerBonus +
        boostBonus +
        Math.random() * (option.variance + boostVariance) * varianceScale +
        gearBonus -
        heatPenalty +
        timingBonus
      const opponentScore = challenger.baseSkill + Math.random() * 28 - opponentPenalty
      const nextPlayerScore = prev.pendingDuel.playerScore + playerScore
      const nextOpponentScore = prev.pendingDuel.opponentScore + opponentScore
      const roundDiff = playerScore - opponentScore
      const timingNote =
        clampedAccuracy >= 0.9
          ? "Perfect hit — you nail the pocket."
          : clampedAccuracy >= 0.78
            ? "Clean hit — you land in the zone."
            : clampedAccuracy >= 0.55
              ? "Close — you graze the pocket."
              : clampedAccuracy >= 0.38
                ? "Miss — you drift off the pocket."
                : "Bad miss — you whiff the pocket."
      const crowdNote =
        roundDiff > 8
          ? "The crowd leans your way."
          : roundDiff < -8
            ? "The crowd drifts to your opponent."
            : "The crowd is split down the middle."
      const reaction = `${timingNote} ${crowdNote}`

      const nextPerformanceItems = selectedBoost
        ? prev.performanceItems.filter((item) => item.id !== selectedBoost.id)
        : prev.performanceItems

      if (prev.pendingDuel.round < prev.pendingDuel.totalRounds) {
        const signaturePick =
          prev.pendingDuel.round >= 2 ? randomFrom(challenger.signatureOptions) : null
        const baseOptions = [...duelOptions].sort(() => Math.random() - 0.5).slice(0, 3)
        const roundOptions = signaturePick
          ? [signaturePick, ...baseOptions.filter((opt) => opt.id !== signaturePick.id).slice(0, 2)]
          : baseOptions
        return {
          ...prev,
          performanceItems: nextPerformanceItems,
          pendingDuel: {
            ...prev.pendingDuel,
            round: prev.pendingDuel.round + 1,
            playerScore: nextPlayerScore,
            opponentScore: nextOpponentScore,
            lastReaction: reaction,
            selectedBoostId: undefined,
            options: roundOptions,
          },
        }
      }

      let outcome: "win" | "lose" | "tie" = "tie"
      if (nextPlayerScore >= nextOpponentScore + 8) outcome = "win"
      if (nextPlayerScore <= nextOpponentScore - 8) outcome = "lose"

      const wager = prev.pendingDuel.wagerAmount

      let nextCash = prev.cash
      let nextRep = prev.reputation
      let nextMarket = prev.market
      let nextInventory = prev.inventory
      const duelMessages: TerminalMessage[] = []

      if (outcome === "win") {
        nextCash += wager
        nextRep = clamp(nextRep + challenger.repWin + option.repBonusOnWin + boostRepBonus, 0, 100)
        duelMessages.push(
          createMessage(ASCII_ART.duelWin, "success", true),
          createMessage(randomFrom(challenger.win), "success"),
          ...(wager
            ? [createMessage(`You win the $${wager} wager.`, "success")]
            : [createMessage("You win the jam.", "success")])
        )
        if (Math.random() < challenger.rareRewardChance) {
          if (Math.random() < 0.5) {
            const special = buildSpecialListing(prev.day, prev.location)
            nextMarket = [...nextMarket, special]
            duelMessages.push(
              createMessage(
                `Rare reward: a special listing appears for ${special.name}.`,
                "event"
              )
            )
          } else {
            const wonItem = buildWonItem(prev.day)
            const slotsUsed = computeSlotsUsed(nextInventory)
            if (slotsUsed + wonItem.slots <= prev.inventoryCapacity) {
              const ownedWon: OwnedItem = {
                ...wonItem,
                purchasePrice: 0,
                heatValue: Math.round(wonItem.hotRisk * 100),
                acquiredDay: prev.day,
                inspected: false,
                authStatus: "none",
                authMultiplier: 1,
                insured: false,
                insurancePaid: 0,
                luthierStatus: "none",
              }
              nextInventory = [...nextInventory, ownedWon]
              duelMessages.push(
                createMessage(
                  `Rare reward: you win ${wonItem.name} on the spot.`,
                  "event"
                )
              )
            } else {
              duelMessages.push(
                createMessage(
                  "Rare reward offered, but your gig bag is full. The prize slips away.",
                  "event"
                )
              )
            }
          }
        }
      } else if (outcome === "lose") {
        nextRep = clamp(nextRep - challenger.repLoss, 0, 100)
        nextCash = Math.max(0, nextCash - wager)
        duelMessages.push(
          createMessage(ASCII_ART.duelLose, "warning", true),
          createMessage(randomFrom(challenger.lose), "warning")
        )
        if (wager) {
          duelMessages.push(createMessage(`You lose the $${wager} wager.`, "warning"))
        }
      } else {
        duelMessages.push(createMessage(randomFrom(challenger.tie), "info"))
      }

      return {
        ...prev,
        cash: nextCash,
        reputation: nextRep,
        inventory: nextInventory,
        heatLevel: computeHeatLevel(nextInventory),
        market: nextMarket,
        performanceItems: nextPerformanceItems,
        pendingDuel: null,
        messages: [...prev.messages, ...duelMessages],
      }
    })
  }

  const handleDuelDecline = () => {
    setGameState((prev) => {
      if (!prev.pendingDuel) return prev
      return {
        ...prev,
        reputation: clamp(prev.reputation - 1, 0, 100),
        pendingDuel: null,
        messages: [
          ...prev.messages,
          createMessage("You decline the jam. The crowd shrugs.", "info"),
        ],
      }
    })
  }

  const handleSelectBoost = (id: string) => {
    setGameState((prev) => {
      if (!prev.pendingDuel) return prev
      return {
        ...prev,
        pendingDuel: {
          ...prev.pendingDuel,
          selectedBoostId: prev.pendingDuel.selectedBoostId === id ? undefined : id,
        },
      }
    })
  }

  const handleContinue = () => {
    track("menu_continue", { runSeed: gameState.runSeed, day: gameState.day, location: gameState.location })
    setShowStartMenu(false)
  }

  const handleSell = (item: OwnedItem) => {
    const canSellNow =
      item.auctionStatus !== "listed" &&
      item.authStatus !== "pending" &&
      item.luthierStatus !== "pending" &&
      (item.acquiredDay < gameState.day || Boolean(item.sameDaySellOk))
    if (canSellNow) {
      const sellPricePreview = getSellPrice(item, gameState.market, gameState.reputation)
      track("sell_success", {
        runSeed: gameState.runSeed,
        day: gameState.day,
        location: gameState.location,
        itemCategory: item.category,
        rarity: item.rarity,
        sellPrice: sellPricePreview,
        purchasePrice: item.purchasePrice,
        profit: sellPricePreview - item.purchasePrice,
      })
    }
    setGameState((prev) => {
      if (item.auctionStatus === "listed") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`${item.name} is at auction on StringTree. Check back tomorrow.`, "info"),
          ],
        }
      }
      if (item.saleBlockedUntilDay && prev.day < item.saleBlockedUntilDay) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(
              `${item.name} is cooling off after a buyer walked. Try again tomorrow.`,
              "info"
            ),
          ],
        }
      }
      if (item.authStatus === "pending") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`${item.name} is still authenticating. Try again tomorrow.`, "info"),
          ],
        }
      }
      if (item.luthierStatus === "pending") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`${item.name} is with the luthier. Try again tomorrow.`, "info"),
          ],
        }
      }
      if (item.acquiredDay >= prev.day && !item.sameDaySellOk) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`You just picked up ${item.name}. Let it sit overnight before you flip it.`, "info"),
          ],
        }
      }
      const sellPrice = getSellPrice(item, prev.market, prev.reputation)
      const profit = sellPrice - item.purchasePrice
      const nextInventory = prev.inventory.filter((owned) => owned.id !== item.id)
      const nextHeat = computeHeatLevel(nextInventory)
      const nextFlipDays = [...prev.recentFlipDays, prev.day].slice(-6)
      const nextBestFlip =
        profit > 0 && (!prev.bestFlip || profit > prev.bestFlip.profit)
          ? { name: item.name, profit }
          : prev.bestFlip
      const nextRarestSold =
        !prev.rarestSold || rarityRank[item.rarity] > rarityRank[prev.rarestSold.rarity]
          ? { name: item.name, rarity: item.rarity }
          : prev.rarestSold
      return {
        ...prev,
        cash: prev.cash + sellPrice,
        inventory: nextInventory,
        heatLevel: nextHeat,
        recentFlipDays: nextFlipDays,
        bestFlip: nextBestFlip,
        rarestSold: nextRarestSold,
        messages: [
          ...prev.messages,
          createMessage(`Sold ${item.name} for $${sellPrice}.`, "success"),
        ],
      }
    })
  }

  const handleAuthenticate = (item: OwnedItem) => {
    setGameState((prev) => {
      if (item.auctionStatus === "listed") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`${item.name} is at auction on StringTree. You can’t authenticate it mid-auction.`, "info"),
          ],
        }
      }
      const cost = getAuthCost(item)
      if (item.authStatus !== "none") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage("Authentication already in progress or completed.", "info"),
          ],
        }
      }
      if (prev.cash < cost) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Not enough cash to authenticate this item.", "warning")],
        }
      }
      const successChance = clamp(
        0.65 - item.heatValue * 0.004 + prev.reputation * 0.003,
        0.15,
        0.85
      )
      const roll = Math.random()
      const outcome = roll < successChance ? "success" : roll < successChance + 0.2 ? "partial" : "fail"
      const readyInDays = Math.random() < 0.7 ? 1 : 2
      const readyDay = prev.day + readyInDays
      const nextInventory = prev.inventory.map((owned) =>
        owned.id === item.id
          ? {
              ...owned,
              authStatus: "pending",
              authReadyDay: readyDay,
              authOutcome: outcome,
            }
          : owned
      )
      return {
        ...prev,
        cash: prev.cash - cost,
        inventory: nextInventory,
        heatLevel: computeHeatLevel(nextInventory),
        messages: [
          ...prev.messages,
          createMessage(`Authentication started for ${item.name}. Results in ${readyInDays} day(s).`, "info"),
        ],
      }
    })
  }

  const handleLuthier = (item: OwnedItem, target: Condition) => {
    setGameState((prev) => {
      if (item.auctionStatus === "listed") {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`${item.name} is at auction on StringTree. You can’t send it to the luthier mid-auction.`, "info"),
          ],
        }
      }
      if (!prev.tools.luthierBench) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("You don't have luthier access yet.", "warning")],
        }
      }
      if (item.luthierStatus === "pending") {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("That item is already with the luthier.", "info")],
        }
      }
      if (item.condition === target) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("That item is already in that condition.", "info")],
        }
      }
      const cost = getLuthierCost(item, target)
      if (prev.cash < cost) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Not enough cash for luthier work.", "warning")],
        }
      }
      const readyInDays = getLuthierDays(target)
      const readyDay = prev.day + readyInDays
      const nextInventory = prev.inventory.map((owned) =>
        owned.id === item.id
          ? {
              ...owned,
              luthierStatus: "pending",
              luthierReadyDay: readyDay,
              luthierTargetCondition: target,
            }
          : owned
      )
      return {
        ...prev,
        cash: prev.cash - cost,
        inventory: nextInventory,
        messages: [
          ...prev.messages,
          createMessage(
            `Luthier work started for ${item.name}. Ready in ${readyInDays} day(s).`,
            "info"
          ),
        ],
      }
    })
  }

  const handleBuyTool = (toolKey: keyof GameState["tools"]) => {
    setGameState((prev) => {
      if (prev.tools[toolKey]) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Already owned.", "info")],
        }
      }
      const cost = TOOL_COSTS[toolKey]
      if (prev.cash < cost) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Not enough cash for that upgrade.", "warning")],
        }
      }
      return {
        ...prev,
        cash: prev.cash - cost,
        tools: { ...prev.tools, [toolKey]: true },
        messages: [...prev.messages, createMessage("Upgrade acquired. New options unlocked.", "success")],
      }
    })
  }

  const handleBuyPerformanceItem = (item: PerformanceItem) => {
    setGameState((prev) => {
      if (prev.cash < item.cost) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Not enough cash for that performance item.", "warning")],
        }
      }
      return {
        ...prev,
        cash: prev.cash - item.cost,
        performanceItems: [...prev.performanceItems, item],
        performanceMarket: prev.performanceMarket.filter((offer) => offer.id !== item.id),
        messages: [
          ...prev.messages,
          createMessage(`Picked up ${item.name} for the next jam.`, "success"),
        ],
      }
    })
  }

  const handleCreditDraw = (amount: number) => {
    setGameState((prev) => {
      const limit = getCreditLimit(prev.reputation)
      if (prev.creditLine.frozen) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Credit line is frozen for the rest of this run.", "warning")],
        }
      }
      if (prev.creditLine.loan) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("You already have an active loan. Repay it first.", "info")],
        }
      }
      if (limit <= 0) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Bank denies the application. Build your rep first.", "warning")],
        }
      }

      const clamped = Math.max(0, Math.min(limit, Math.floor(amount)))
      if (clamped <= 0) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("No draw amount selected.", "info")],
        }
      }

      const rate = getCreditInterestRate(prev.reputation)
      const dueDay = prev.day + CREDIT_TERM_DAYS
      const balanceDue = Math.round(clamped * (1 + rate))

      return {
        ...prev,
        cash: prev.cash + clamped,
        creditLine: {
          ...prev.creditLine,
          loan: {
            principal: clamped,
            balanceDue,
            interestRate: rate,
            dueDay,
            defaulted: false,
            repPenaltyApplied: false,
          },
        },
        messages: [
          ...prev.messages,
          createMessage(`Dealer Credit Line approved. You draw $${clamped.toLocaleString()}.`, "success"),
          createMessage(
            `Due Day ${dueDay}: $${balanceDue.toLocaleString()} (${Math.round(rate * 100)}% interest).`,
            "info"
          ),
        ],
      }
    })
  }

  const handleCreditRepay = (amount: number) => {
    setGameState((prev) => {
      const loan = prev.creditLine.loan
      if (!loan) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("No active loan to repay.", "info")],
        }
      }

      const desired = amount > 0 ? Math.floor(amount) : loan.balanceDue
      const payment = Math.max(0, Math.min(prev.cash, loan.balanceDue, desired))
      if (payment <= 0) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Not enough cash to make a payment.", "warning")],
        }
      }

      const remaining = Math.max(0, loan.balanceDue - payment)
      const cleared = remaining <= 0

      return {
        ...prev,
        cash: prev.cash - payment,
        creditLine: {
          ...prev.creditLine,
          loan: cleared ? null : { ...loan, balanceDue: remaining },
        },
        messages: [
          ...prev.messages,
          createMessage(`Payment sent: $${payment.toLocaleString()}. Remaining: $${remaining.toLocaleString()}.`, "success"),
          ...(cleared
            ? [createMessage("Loan cleared. Your credit line is available again.", "info")]
            : []),
        ],
      }
    })
  }

  const handleUpgradeCase = () => {
    // Trigger toast outside of the state updater to avoid setState-during-render warnings.
    const currentTier = (gameState.bagTier ?? inferBagTier(gameState.inventoryCapacity)) as BagTier
    const nextTierPreview = (Math.min(2, currentTier + 1) as BagTier)
    const costPreview = nextTierPreview === 1 ? 2500 : 7500
    const repReqPreview = nextTierPreview === 1 ? 45 : 70
    const labelPreview = getBagLabel(nextTierPreview)
    const canUpgradePreview =
      currentTier < 2 && gameState.reputation >= repReqPreview && gameState.cash >= costPreview

    if (canUpgradePreview) {
      toast({
        title: "Upgrade acquired",
        description: `${labelPreview} (+5 slots)`,
        duration: 2200,
      })
    }

    setGameState((prev) => {
      const tier = (prev.bagTier ?? inferBagTier(prev.inventoryCapacity)) as BagTier
      if (tier >= 2) {
        return {
          ...prev,
          bagTier: tier,
          inventoryCapacity: getBagCapacity(tier),
          messages: [...prev.messages, createMessage("You’re already hauling a Flight Case.", "info")],
        }
      }

      const nextTier = (tier + 1) as BagTier
      const cost = nextTier === 1 ? 2500 : 7500
      const repReq = nextTier === 1 ? 45 : 70
      const label = getBagLabel(nextTier)

      if (prev.reputation < repReq) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`Bank says no. Requires Rep ${repReq}+ for a ${label}.`, "warning"),
          ],
        }
      }
      if (prev.cash < cost) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage(`Not enough cash for a ${label}. Need $${cost.toLocaleString()}.`, "warning"),
          ],
        }
      }

      const nextCapacity = getBagCapacity(nextTier)
      return {
        ...prev,
        cash: prev.cash - cost,
        bagTier: nextTier,
        inventoryCapacity: nextCapacity,
        messages: [
          ...prev.messages,
          createMessage(`Upgrade acquired: ${label}. Capacity is now ${nextCapacity} slots.`, "success"),
        ],
      }
    })
  }

  const handleEncounterDecline = () => {
    setGameState((prev) => {
      const encounter = prev.pendingEncounter
      if (!encounter) return prev

      // If an auction already resolved, just close the modal without "passing" messaging.
      if (encounter.type === "auction" && encounter.resolved) {
        return { ...prev, pendingEncounter: null }
      }

      const tradeDeclinesBump = encounter.type === "tradeOffer" ? 1 : 0
      return {
        ...prev,
        tradeDeclines: prev.tradeDeclines + tradeDeclinesBump,
        pendingEncounter: null,
        messages: [...prev.messages, createMessage("You pass on the lead.", "info")],
      }
    })
  }

  const handleBulkLotPurchase = () => {
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "bulkLot") return prev
      const { items, totalCost, projectRate } = prev.pendingEncounter
      const slotsUsed = computeSlotsUsed(prev.inventory)
      const newSlots = items.reduce((sum, item) => sum + item.slots, 0)
      if (slotsUsed + newSlots > prev.inventoryCapacity) {
        return {
          ...prev,
          pendingEncounter: null,
          messages: [
            ...prev.messages,
            createMessage("You can't carry it all. The bulk lot moves on.", "warning"),
          ],
        }
      }
      if (prev.cash < totalCost) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage("Not enough cash to grab the bulk lot.", "warning"),
          ],
        }
      }
      const upgradedItems: OwnedItem[] = items.map((item) => ({
        ...item,
        purchasePrice: Math.round(item.priceToday * 0.75),
        heatValue: Math.round(item.hotRisk * 100),
        acquiredDay: prev.day,
        inspected: false,
        authStatus: "none",
        authMultiplier: 1,
        insured: false,
        insurancePaid: 0,
        luthierStatus: "none",
        condition: Math.random() < projectRate ? "Project" : item.condition,
      }))
      return {
        ...prev,
        cash: prev.cash - totalCost,
        inventory: [...prev.inventory, ...upgradedItems],
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage("You grab the lot cheap. It’s messy but profitable.", "success"),
        ],
      }
    })
  }

  const handleTradeAccept = () => {
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "tradeOffer") return prev
      const { requestedItem, offeredItem } = prev.pendingEncounter
      const nextInventory = prev.inventory.filter((item) => item.id !== requestedItem.id)
      const ownedOffered: OwnedItem = {
        ...offeredItem,
        purchasePrice: 0,
        heatValue: Math.round(offeredItem.hotRisk * 100),
        acquiredDay: prev.day,
        inspected: false,
        authStatus: "none",
        authMultiplier: 1,
        insured: false,
        insurancePaid: 0,
        luthierStatus: "none",
      }
      return {
        ...prev,
        inventory: [...nextInventory, ownedOffered],
        reputation: clamp(prev.reputation + 1, 0, 100),
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage(
            `You trade ${requestedItem.name} for ${offeredItem.name}.`,
            "success"
          ),
        ],
      }
    })
  }

  const handleTradeDecline = () => {
    setGameState((prev) => {
      const repPenalty = prev.tradeDeclines >= 2 ? 1 : 0
      return {
        ...prev,
        reputation: clamp(prev.reputation - repPenalty, 0, 100),
        tradeDeclines: prev.tradeDeclines + 1,
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage("You pass. The trader shrugs and walks.", "info"),
        ],
      }
    })
  }

  const handleMysteriousBuy = () => {
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "mysteriousListing") return prev
      const item = prev.pendingEncounter.item
      const slotsUsed = computeSlotsUsed(prev.inventory)
      if (slotsUsed + item.slots > prev.inventoryCapacity) {
        return {
          ...prev,
          pendingEncounter: null,
          messages: [
            ...prev.messages,
            createMessage("No space for the mystery listing. It disappears.", "warning"),
          ],
        }
      }
      if (prev.cash < item.priceToday) {
        return {
          ...prev,
          messages: [
            ...prev.messages,
            createMessage("Not enough cash to grab that listing.", "warning"),
          ],
        }
      }
      if (Math.random() < item.scamRisk) {
        return {
          ...prev,
          cash: Math.max(0, prev.cash - item.priceToday),
          reputation: clamp(prev.reputation - 4, 0, 100),
          pendingEncounter: null,
          messages: [
            ...prev.messages,
            createMessage("The listing vanishes after payment. You got burned.", "warning"),
          ],
        }
      }
      const owned: OwnedItem = {
        ...item,
        purchasePrice: item.priceToday,
        heatValue: Math.round(item.hotRisk * 100),
        acquiredDay: prev.day,
        sameDaySellOk: true,
        auctionStatus: "none",
        inspected: false,
        authStatus: "none",
        authMultiplier: 1,
        insured: false,
        insurancePaid: 0,
        luthierStatus: "none",
      }
      return {
        ...prev,
        cash: prev.cash - item.priceToday,
        inventory: [...prev.inventory, owned],
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage("Proof checks out. You jump on the listing.", "success"),
        ],
      }
    })
  }

  const handleMysteriousProof = () => {
    const snapshot = gameStateRef.current
    if (!snapshot.pendingEncounter || snapshot.pendingEncounter.type !== "mysteriousListing") return
    if (snapshot.pendingEncounter.proofChecked) {
      toast({
        title: "Proof already checked",
        description: "You already asked for proof on this listing.",
        duration: 2200,
      })
      return
    }

    const roll = Math.random()
    if (roll < 0.35) {
      toast({
        title: "Listing vanished",
        description: "They pulled it as soon as you asked for proof.",
        variant: "destructive",
        duration: 2800,
      })
      setGameState((prev) => {
        if (!prev.pendingEncounter || prev.pendingEncounter.type !== "mysteriousListing") return prev
        return {
          ...prev,
          pendingEncounter: null,
          messages: [
            ...prev.messages,
            createMessage("You ask for proof. The listing disappears immediately.", "warning"),
          ],
        }
      })
      return
    }

    const before = snapshot.pendingEncounter.item.scamRisk
    const after = clamp(before - 0.25, 0.05, 0.9)
    toast({
      title: "Proof checks out",
      description: `Scam risk reduced.`,
      duration: 2400,
    })
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "mysteriousListing") return prev
      return {
        ...prev,
        pendingEncounter: {
          ...prev.pendingEncounter,
          item: {
            ...prev.pendingEncounter.item,
            scamRisk: after,
          },
          proofChecked: true,
        },
        messages: [
          ...prev.messages,
          createMessage("Proof checks out. Scam risk drops.", "info"),
        ],
      }
    })
  }

  const handleRepairComp = () => {
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "repairScare") return prev
      const { item, discountPrice } = prev.pendingEncounter
      const nextInventory = prev.inventory.filter((owned) => owned.id !== item.id)
      return {
        ...prev,
        cash: prev.cash + discountPrice,
        reputation: clamp(prev.reputation + 1, 0, 100),
        inventory: nextInventory,
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage(`You knock off $${item.purchasePrice - discountPrice} and close the deal.`, "success"),
        ],
      }
    })
  }

  const handleRepairRefuse = () => {
    setGameState((prev) => {
      if (!prev.pendingEncounter || prev.pendingEncounter.type !== "repairScare") return prev
      const { item } = prev.pendingEncounter
      const blockedUntil = prev.day + 1
      const nextInventory = prev.inventory.map((owned) =>
        owned.id === item.id ? { ...owned, saleBlockedUntilDay: blockedUntil } : owned
      )
      return {
        ...prev,
        reputation: clamp(prev.reputation - 1, 0, 100),
        inventory: nextInventory,
        pendingEncounter: null,
        messages: [
          ...prev.messages,
          createMessage("You hold firm. The buyer walks.", "warning"),
          createMessage("That item won’t move today. Try again tomorrow.", "info"),
        ],
      }
    })
  }

  const resolveAuction = (state: GameState, maxBid: number) => {
    if (!state.pendingEncounter || state.pendingEncounter.type !== "auction") {
      return { next: state, toastPayload: null as null | Parameters<typeof toast>[0] }
    }
    const { item, startingBid, buyerPremiumRate, minReputation } = state.pendingEncounter

    if (state.reputation < minReputation) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "blocked", maxBid: Math.max(0, Math.min(state.cash, Math.floor(maxBid))) },
          },
          messages: [
            ...state.messages,
            createMessage(
              "StringTree Live Auction is invite-only tonight. Your rep isn't high enough.",
              "warning"
            ),
          ],
        },
        toastPayload: {
          title: "Auction blocked",
          description: `Rep ${minReputation}+ required`,
          variant: "destructive",
          duration: 2400,
        },
      }
    }

    const clampedBid = Math.max(0, Math.min(state.cash, Math.floor(maxBid)))
    if (clampedBid < 1) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "no_bid", maxBid: clampedBid, finalPrice: startingBid },
          },
          messages: [
            ...state.messages,
            createMessage(
              `No bid placed. The lot closes at $${startingBid.toLocaleString()}.`,
              "info"
            ),
          ],
        },
        toastPayload: {
          title: "No bid placed",
          description: `Opening bid was $${startingBid.toLocaleString()}`,
          duration: 2200,
        },
      }
    }

    const increment = getAuctionIncrement(item.basePrice)
    const opponentMax = simulateAuctionOpponentMax(item.basePrice, state.runSeed, state.day, state.location)
    const highestMax = Math.max(clampedBid, opponentMax)
    if (highestMax < startingBid) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "passed", maxBid: clampedBid, finalPrice: startingBid },
          },
          messages: [
            ...state.messages,
            createMessage(
              `Bidding fizzles out under the opening bid. PASSED at $${startingBid.toLocaleString()}.`,
              "info"
            ),
          ],
        },
        toastPayload: {
          title: "No sale",
          description: `Opening bid was $${startingBid.toLocaleString()}`,
          duration: 2400,
        },
      }
    }
    const opponentWins = opponentMax >= clampedBid
    const finalPrice = opponentWins
      ? Math.max(startingBid, clampedBid + increment)
      : Math.min(clampedBid, Math.max(startingBid, opponentMax + increment))

    if (opponentWins) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "outbid", maxBid: clampedBid, finalPrice },
          },
          messages: [
            ...state.messages,
            createMessage(
              `Bidding climbs past $${clampedBid.toLocaleString()}… SOLD for $${finalPrice.toLocaleString()} (not to you).`,
              "warning"
            ),
          ],
        },
        toastPayload: {
          title: "Outbid",
          description: `Sold for $${finalPrice.toLocaleString()} • Your max: $${clampedBid.toLocaleString()}`,
          variant: "destructive",
          duration: 2600,
        },
      }
    }

    const premium = Math.round(finalPrice * buyerPremiumRate)
    const totalCost = finalPrice + premium
    if (totalCost > state.cash) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "forfeited", maxBid: clampedBid, finalPrice, premium, totalCost },
          },
          messages: [
            ...state.messages,
            createMessage(
              `You win at $${finalPrice.toLocaleString()}, but the 5% buyer premium pushes it out of reach. The lot is forfeited.`,
              "warning"
            ),
          ],
        },
        toastPayload: {
          title: "Won, but forfeited",
          description: `Premium pushed total to $${totalCost.toLocaleString()}`,
          variant: "destructive",
          duration: 3000,
        },
      }
    }

    const slotsUsed = computeSlotsUsed(state.inventory)
    if (slotsUsed + item.slots > state.inventoryCapacity) {
      return {
        next: {
          ...state,
          pendingEncounter: {
            ...state.pendingEncounter,
            resolved: { outcome: "no_space", maxBid: clampedBid, finalPrice, premium, totalCost },
          },
          messages: [
            ...state.messages,
            createMessage(
              "You win the auction… but your gig bag is full. The lot goes to the runner-up.",
              "warning"
            ),
          ],
        },
        toastPayload: {
          title: "Won, but no space",
          description: "Your case is full",
          variant: "destructive",
          duration: 2600,
        },
      }
    }

    const owned: OwnedItem = {
      ...item,
      purchasePrice: totalCost,
      heatValue: Math.round(item.hotRisk * 100),
      acquiredDay: state.day,
      auctionStatus: "none",
      inspected: false,
      authStatus: "none",
      authMultiplier: 1,
      insured: false,
      insurancePaid: 0,
      luthierStatus: "none",
    }

    return {
      next: {
        ...state,
        cash: state.cash - totalCost,
        inventory: [...state.inventory, owned],
        pendingEncounter: {
          ...state.pendingEncounter,
          resolved: { outcome: "won", maxBid: clampedBid, finalPrice, premium, totalCost },
        },
        messages: [
          ...state.messages,
          createMessage(`Bidding climbs… SOLD to you for $${finalPrice.toLocaleString()}.`, "success"),
          createMessage(`StringTree buyer premium (5%): $${premium.toLocaleString()}.`, "info"),
        ],
      },
      toastPayload: {
        title: "Auction won",
        description: `${item.name} • $${finalPrice.toLocaleString()} (+$${premium.toLocaleString()} premium)`,
        duration: 3200,
      },
    }
  }

  const handleAuctionResolve = (maxBid: number) => {
    const snapshot = gameStateRef.current
    const auction =
      snapshot.pendingEncounter && snapshot.pendingEncounter.type === "auction"
        ? snapshot.pendingEncounter
        : null
    track("auction_bid", {
      runSeed: snapshot.runSeed,
      day: snapshot.day,
      location: snapshot.location,
      maxBid,
      startingBid: auction?.startingBid,
      itemCategory: auction?.item.category,
      rarity: auction?.item.rarity,
    })

    const { toastPayload } = resolveAuction(snapshot, maxBid)
    const title = toastPayload?.title ?? "Unknown"
    const outcome =
      title === "Auction won"
        ? "won"
        : title === "Outbid"
          ? "outbid"
          : title === "No sale"
            ? "passed"
            : title === "No bid placed"
              ? "no_bid"
              : title === "Won, but forfeited"
                ? "forfeited"
                : title === "Won, but no space"
                  ? "no_space"
                  : title === "Auction blocked"
                    ? "blocked"
                    : "unknown"
    track("auction_result", {
      runSeed: snapshot.runSeed,
      day: snapshot.day,
      location: snapshot.location,
      outcome,
      toastTitle: title,
      maxBid,
      startingBid: auction?.startingBid,
      itemCategory: auction?.item.category,
      rarity: auction?.item.rarity,
    })
    setGameState((prev) => resolveAuction(prev, maxBid).next)
    if (toastPayload) toast(toastPayload)
  }

  if (gameState.isGameOver) {
    const score = calculateScore(
      gameState.cash,
      gameState.inventory,
      gameState.market,
      gameState.reputation
    )
    const isStandardRun = gameState.totalDays === 21
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-lg space-y-4">
          <pre className="text-xs text-primary leading-tight">{ASCII_ART.endRun}</pre>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Run Complete</p>
            <h1 className="text-3xl font-bold text-primary">Fret Wars Summary</h1>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-left">
            <div className="text-sm text-muted-foreground">Final Score</div>
            <div className="text-3xl font-bold text-foreground">${score.toLocaleString()}</div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Day</span>
                <span className="text-foreground">{gameState.day}/{gameState.totalDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cash</span>
                <span className="text-foreground">${gameState.cash.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inventory</span>
                <span className="text-foreground">
                  {computeSlotsUsed(gameState.inventory)}/{gameState.inventoryCapacity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reputation</span>
                <span className="text-foreground">{gameState.reputation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Best Flip</span>
                <span className="text-foreground">
                  {gameState.bestFlip
                    ? `${gameState.bestFlip.name} (+$${gameState.bestFlip.profit.toLocaleString()})`
                    : "None"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rarest Sold</span>
                <span className="text-foreground">
                  {gameState.rarestSold
                    ? `${gameState.rarestSold.name} (${gameState.rarestSold.rarity})`
                    : "None"}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-card p-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {isStandardRun ? "Post your score" : "Leaderboards"}
              </div>
              {isStandardRun ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Display name</div>
                      <input
                        value={scorePostName}
                        onChange={(e) => setScorePostName(e.target.value)}
                        placeholder="Anonymous"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Email (optional)</div>
                      <input
                        value={scorePostEmail}
                        onChange={(e) => setScorePostEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                        inputMode="email"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={scorePostOptIn}
                      onChange={(e) => setScorePostOptIn(e.target.checked)}
                    />
                    Email me updates about Fret Wars.
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={handlePostScore}
                      disabled={scorePostStatus.state === "posting" || scorePostStatus.state === "posted"}
                      className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {scorePostStatus.state === "posting"
                        ? "Posting…"
                        : scorePostStatus.state === "posted"
                          ? "Posted"
                          : "Post Score"}
                    </button>
                    <a
                      href="/leaderboard"
                      className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
                    >
                      Leaderboard
                    </a>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Only completed 21-day standard runs can be posted to the leaderboard.
                  </div>
                  {scorePostStatus.state === "error" && (
                    <div className="text-xs text-destructive">{scorePostStatus.message}</div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div>
                    Posting scores is only available for completed <span className="text-foreground font-semibold">21-day standard runs</span>.
                  </div>
                  <div className="text-xs">
                    This run length: <span className="text-foreground font-semibold">{gameState.totalDays} days</span>
                  </div>
                  <a
                    href="/leaderboard"
                    className="block w-full rounded-md border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
                  >
                    View Leaderboard
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={handleShare}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Share Result
            </button>
            <button
              onClick={handleNewRun}
              className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
            >
              New Run
            </button>
            {shareStatus === "copied" && (
              <p className="text-xs text-primary">Copied to clipboard.</p>
            )}
            {shareStatus === "error" && (
              <p className="text-xs text-destructive">Unable to access clipboard.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">A StringTree Game</p>
        </div>
      </div>
    )
  }

  if (showStartMenu) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">A StringTree Game</p>
            <h1 className="text-3xl font-bold text-primary">Fret Wars</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Trade guitars, amps, pedals, and parts across the city. Buy low, sell high, keep it legit.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-3 text-left">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Run Length (Days)
                </label>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {runLength}
                </span>
              </div>

              <Slider
                min={7}
                max={90}
                step={1}
                value={[runLength]}
                onValueChange={(value) => setRunLength(value[0] ?? 21)}
                aria-label="Run length in days"
                className="mt-3"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>7</span>
                <span>90</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Standard run: 21 days.
              </p>
            </div>
            <button
              onClick={handleNewRun}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New Game
            </button>
            <button
              onClick={handleContinue}
              disabled={!hasSavedGame}
              className="w-full rounded-md border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
            <a
              href="/leaderboard"
              className="block w-full rounded-md border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
            >
              Leaderboard
            </a>
            <button
              onClick={() => setShowHelp((prev) => !prev)}
              className="w-full rounded-md border border-border bg-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Help
            </button>
            {!hasSavedGame && (
              <button
                onClick={() => setShowStartMenu(false)}
                className="w-full rounded-md border border-border bg-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                Back to Game
              </button>
            )}
          </div>
          {showHelp && (
            <div className="rounded-lg border border-border bg-card p-4 text-left text-sm text-muted-foreground">
              <p className="mb-2 text-foreground">How it works</p>
              <ul className="space-y-1">
                <li>Buy and sell gear each day to grow cash.</li>
                <li>Travel ends the day and moves you to a new market.</li>
                <li>Use "Ask for Proof" to reduce scam risk.</li>
                <li>Authenticate items to lower provenance risk.</li>
                <li>Reputation improves prices and reduces risk.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Mobile Layout: fixed viewport, terminal pinned at top, market scrolls below */}
      <div className="flex h-dvh flex-col overflow-hidden lg:hidden">
        <div className="shrink-0">
          <Header onMenu={handleOpenMenu} />
        </div>
        <StatusBar gameState={gameState} className="shrink-0" />
        <div className="shrink-0 h-[200px] min-h-0">
          <div className="flex h-full flex-col border-b border-border bg-background">
            <div className="flex shrink-0 items-center justify-between px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Terminal
              </span>
              <button
                type="button"
                onClick={() => setIsTerminalExpanded(true)}
                className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
              >
                Expand
              </button>
            </div>
            <TerminalFeed
              messages={gameState.messages.slice(-10)}
              terminalRef={terminalRef}
              className="h-full flex-1 min-h-0 p-3"
              scrollMode="static"
              showCursor={false}
              staticPinToBottom
            />
          </div>
        </div>
        <div ref={marketMobileScrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <MarketSection
            items={gameState.market}
            onItemSelect={handleItemSelect}
            inspectedIds={gameState.inspectedMarketIds}
            showDeals={gameState.tools.priceGuide}
            isDeal={isSmokingDeal}
          />
        </div>
        <ActionBar onAction={handleAction} className="shrink-0" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden h-dvh lg:grid lg:grid-cols-[280px_1fr_320px]">
        <aside className="flex flex-col border-r border-border bg-card p-4">
          <Header onMenu={handleOpenMenu} />
          <StatusBar gameState={gameState} className="mt-4" />
        </aside>
        <main className="flex flex-col overflow-hidden">
          <TerminalFeed
            messages={gameState.messages}
            terminalRef={terminalRef}
            className="flex-1"
            onScroll={handleTerminalScroll}
          />
          <ActionBar onAction={handleAction} className="border-t border-border" />
        </main>
        <aside className="flex flex-col overflow-y-auto border-l border-border bg-card">
          <MarketSection
            items={gameState.market}
            onItemSelect={handleItemSelect}
            inspectedIds={gameState.inspectedMarketIds}
            showDeals={gameState.tools.priceGuide}
            isDeal={isSmokingDeal}
          />
        </aside>
      </div>

      <DealModal
        item={selectedItem}
        isOpen={isModalOpen}
        isInspected={isSelectedInspected}
        trustTier={
          selectedItem
            ? getTrustTier(
                selectedItem.scamRisk - (gameState.tools.serialScanner ? 0.05 : 0),
                gameState.reputation,
                isSelectedInspected
              )
            : undefined
        }
        insuranceAvailable={gameState.tools.insurancePlan}
        insuranceSelected={insuranceSelected}
        insuranceCost={selectedItem ? getInsuranceCost(selectedItem.priceToday) : 0}
        onToggleInsurance={() => setInsuranceSelected((prev) => !prev)}
        onClose={() => setIsModalOpen(false)}
        onBuy={handleBuy}
        onAskProof={handleAskProof}
        onWalkAway={handleWalkAway}
      />

      <TravelModal
        isOpen={isTravelModalOpen}
        currentLocation={gameState.location}
        onClose={() => setIsTravelModalOpen(false)}
        onTravel={handleTravel}
      />

      <Dialog open={isTerminalExpanded} onOpenChange={setIsTerminalExpanded}>
        <DialogContent className="fret-scrollbar max-h-[85vh] max-w-lg overflow-y-auto pr-1 border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg text-foreground">Terminal</DialogTitle>
          </DialogHeader>
          <TerminalFeed
            messages={gameState.messages}
            terminalRef={terminalExpandedRef}
            className="h-[60vh] p-3"
            scrollMode="scroll"
            onScroll={handleExpandedTerminalScroll}
          />
        </DialogContent>
      </Dialog>

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        items={gameState.inventory}
        day={gameState.day}
        reputation={gameState.reputation}
        cash={gameState.cash}
        bagTier={gameState.bagTier}
        bagLabel={getBagLabel(gameState.bagTier)}
        onUpgradeCase={handleUpgradeCase}
        creditLine={gameState.creditLine}
        creditLimit={getCreditLimit(gameState.reputation)}
        creditInterestRate={getCreditInterestRate(gameState.reputation)}
        creditTermDays={CREDIT_TERM_DAYS}
        onCreditDraw={handleCreditDraw}
        onCreditRepay={handleCreditRepay}
        tools={gameState.tools}
        toolCosts={TOOL_COSTS}
        performanceMarket={gameState.performanceMarket}
        performanceItems={gameState.performanceItems}
        getSellPrice={(item) => getSellPrice(item, gameState.market, gameState.reputation)}
        getAuthCost={getAuthCost}
        getLuthierCost={getLuthierCost}
        onSell={handleSell}
        onAuthenticate={handleAuthenticate}
        onLuthier={handleLuthier}
        onListAuction={openPlayerAuction}
        onBuyTool={handleBuyTool}
        onBuyPerformanceItem={handleBuyPerformanceItem}
      />

      <SellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        day={gameState.day}
        items={gameState.inventory}
        getSellPrice={(item) => getSellPrice(item, gameState.market, gameState.reputation)}
        onSell={handleSell}
        onRepairScare={(item, fullPrice, discountPrice) =>
          setGameState((prev) => ({
            ...prev,
            pendingEncounter: {
              type: "repairScare",
              item,
              fullPrice,
              discountPrice,
            },
            messages: [
              ...prev.messages,
              createMessage(ASCII_ART.repairScare, "warning", true),
            ],
          }))
        }
      />

      <PlayerAuctionModal
        isOpen={Boolean(playerAuctionItemId)}
        item={playerAuctionItemId ? gameState.inventory.find((owned) => owned.id === playerAuctionItemId) ?? null : null}
        baselinePrice={playerAuctionBaseline}
        buyerPremiumRate={PLAYER_AUCTION_BUYER_PREMIUM_RATE}
        resolveDay={gameState.day + 1}
        onClose={closePlayerAuction}
        onConfirm={handleConfirmPlayerAuction}
      />

      {gameState.pendingDuel && (
        <DuelModal
          isOpen={Boolean(gameState.pendingDuel)}
          challengerLabel={gameState.pendingDuel.challengerLabel}
          intro={gameState.pendingDuel.intro}
          options={gameState.pendingDuel.options}
          performanceItems={gameState.performanceItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
          }))}
          selectedBoostId={gameState.pendingDuel.selectedBoostId}
          wagerAmount={gameState.pendingDuel.wagerAmount}
          round={gameState.pendingDuel.round}
          totalRounds={gameState.pendingDuel.totalRounds}
          playerScore={gameState.pendingDuel.playerScore}
          opponentScore={gameState.pendingDuel.opponentScore}
          lastReaction={gameState.pendingDuel.lastReaction}
          onSelectBoost={handleSelectBoost}
          onChoose={resolveDuel}
          onDecline={handleDuelDecline}
        />
      )}

      {gameState.pendingEncounter && (
        <EncounterModal
          encounter={gameState.pendingEncounter}
          cash={gameState.cash}
          onClose={handleEncounterDecline}
          onBulkBuy={handleBulkLotPurchase}
          onTradeAccept={handleTradeAccept}
          onTradeDecline={handleTradeDecline}
          onMysteryBuy={handleMysteriousBuy}
          onMysteryProof={handleMysteriousProof}
          onAuctionResolve={handleAuctionResolve}
          onRepairComp={handleRepairComp}
          onRepairRefuse={handleRepairRefuse}
        />
      )}
    </div>
  )
}
