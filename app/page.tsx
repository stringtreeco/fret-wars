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

export type HeatLevel = "Low" | "Medium" | "High"
export type Rarity = "common" | "uncommon" | "rare" | "legendary"
export type Condition = "Mint" | "Player" | "Project"

export interface GameState {
  day: number
  totalDays: number
  location: string
  cash: number
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
  favorTokens: number
  repoShield: boolean
  market: MarketItem[]
  messages: TerminalMessage[]
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

export interface TerminalMessage {
  id: string
  text: string
  type: "info" | "warning" | "success" | "event"
}

const STORAGE_KEY = "fretwars:state"

const initialMessages: TerminalMessage[] = [
  { id: "1", text: "Welcome to Fret Wars. The gear market awaits.", type: "info" },
  { id: "2", text: "Market volatility increases after influencer buzz.", type: "event" },
  { id: "3", text: "Pawn shop owner quietly shows you a vintage Fender case.", type: "event" },
  { id: "4", text: "A local dealer warns: 'Watch out for the '62 parts flooding in.'", type: "warning" },
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
]

const marketShiftMessages = [
  "Influencer hype nudges boutique prices upward.",
  "Estate sale glut lowers vintage asking prices.",
  "Pawn shops are flush after a touring weekend.",
  "Collectors are quiet today. Fewer bidding wars.",
  "Word is a shop just got raided. Sellers are nervous.",
]

const repoMessages = [
  "Two suits flash badges. Serial checks get tense fast.",
  "A patrol rolls through and asks about your haul.",
  "A buyer backs out. Says heat is high after a raid.",
  "You spot a familiar van circling the block.",
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
  const count = 5 + Math.floor(rng() * 3)
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

  return results
}

const getMarketShiftMessage = (day: number, location: string, runSeed: string) => {
  const rng = mulberry32(hashSeed(`${runSeed}-shift-${day}-${location}`))
  return marketShiftMessages[Math.floor(rng() * marketShiftMessages.length)]
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const computeHeatLevel = (inventory: OwnedItem[]): HeatLevel => {
  const totalHeat = inventory.reduce((sum, item) => sum + item.heatValue, 0)
  if (totalHeat >= 70) return "High"
  if (totalHeat >= 30) return "Medium"
  return "Low"
}

const computeSlotsUsed = (inventory: OwnedItem[]) =>
  inventory.reduce((sum, item) => sum + item.slots, 0)

const getTrustTier = (scamRisk: number, reputation: number) => {
  const adjustedRisk = clamp(scamRisk - reputation * 0.002, 0, 1)
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

const calculateScore = (cash: number, inventory: OwnedItem[], market: MarketItem[], reputation: number) => {
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + getSellPrice(item, market, reputation),
    0
  )
  return Math.round(cash + inventoryValue + reputation * 50)
}

const createMessage = (
  text: string,
  type: TerminalMessage["type"] = "info"
): TerminalMessage => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  text,
  type,
})

const createInitialGameState = (runSeed: string): GameState => {
  return {
    day: 1,
    totalDays: 30,
    location: "Downtown Music Row",
    cash: 2500,
    inventoryCapacity: 10,
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
    favorTokens: 0,
    repoShield: false,
    market: generateMarket(1, "Downtown Music Row", runSeed),
    messages: initialMessages,
    runSeed,
  }
}

export default function FretWarsGame() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState("seed"))
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [insuranceSelected, setInsuranceSelected] = useState(false)
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle")
  const [showStartMenu, setShowStartMenu] = useState(true)
  const [hasSavedGame, setHasSavedGame] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      setHasSavedGame(true)
      try {
        const parsed = JSON.parse(savedState) as Partial<GameState>
        const fallback = createInitialGameState("seed")
        const merged = { ...fallback, ...parsed }
        const normalizedInventory = (parsed.inventory ?? fallback.inventory).map((item) => ({
          ...item,
          condition: item.condition ?? "Player",
          rarity: item.rarity ?? "common",
          slots:
            item.slots ??
            (item.category === "Amp" ? 3 : item.category === "Guitar" ? 2 : 1),
          authStatus: item.authStatus ?? "none",
          authMultiplier: item.authMultiplier ?? 1,
          insured: item.insured ?? false,
          insurancePaid: item.insurancePaid ?? 0,
          luthierStatus: item.luthierStatus ?? "none",
        }))
        const marketHasDetails = parsed.market?.every((item) => item.condition && item.slots && item.rarity)
        setGameState({
          ...merged,
          inventory: normalizedInventory,
          market:
            marketHasDetails && parsed.market
              ? parsed.market
              : generateMarket(merged.day, merged.location, merged.runSeed),
          messages: parsed.messages ?? fallback.messages,
          inspectedMarketIds: parsed.inspectedMarketIds ?? fallback.inspectedMarketIds,
          recentFlipDays: parsed.recentFlipDays ?? fallback.recentFlipDays,
          isGameOver: parsed.isGameOver ?? fallback.isGameOver,
          bestFlip: parsed.bestFlip ?? fallback.bestFlip,
          rarestSold: parsed.rarestSold ?? fallback.rarestSold,
          tools: parsed.tools ?? fallback.tools,
          favorTokens: parsed.favorTokens ?? fallback.favorTokens,
          repoShield: parsed.repoShield ?? fallback.repoShield,
        })
      } catch {
        setGameState(createInitialGameState("seed"))
      }
    } else {
      const newSeed =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString()
      setGameState(createInitialGameState(newSeed))
      setHasSavedGame(false)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [gameState.messages])

  const handleAction = (action: string) => {
    switch (action) {
      case "travel":
        setIsTravelModalOpen(true)
        break
      case "gigbag":
        if (gameState.inventory.length === 0) {
          addMessage("Your gig bag is empty. Hit the market and pick something up.", "info")
        } else {
          const slotsUsed = computeSlotsUsed(gameState.inventory)
          addMessage(
            `Gig Bag: ${slotsUsed}/${gameState.inventoryCapacity} slots used.`,
            "info"
          )
          addMessage("Open the market and tap items to buy or sell.", "info")
        }
        break
      case "sell":
        setIsInventoryModalOpen(true)
        break
      case "endday":
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
        setGameState((prev) => ({
          ...prev,
          cash: Math.max(0, prev.cash - totalCost + refund),
          reputation: clamp(prev.reputation - 6, 0, 100),
          market: prev.market.filter((item) => item.id !== selectedItem.id),
          inspectedMarketIds: prev.inspectedMarketIds.filter((id) => id !== selectedItem.id),
          messages: [
            ...prev.messages,
            createMessage(
              insuranceSelected
                ? `Scammed on the ${selectedItem.name}. Insurance reimburses $${refund}.`
                : `Scammed on the ${selectedItem.name}. The seller ghosts you and your cash vanishes.`,
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
      addMessage(
        insuranceSelected
          ? `Purchased ${selectedItem.name} for $${selectedItem.priceToday} + $${insuranceCost} insurance.`
          : `Purchased ${selectedItem.name} for $${selectedItem.priceToday}.`,
        "success"
      )
      setIsModalOpen(false)
      setSelectedItem(null)
    } else {
      addMessage("Not enough cash for this deal.", "warning")
    }
  }

  const handleAskProof = () => {
    if (!selectedItem) return
    setGameState((prev) => {
      if (prev.inspectedMarketIds.includes(selectedItem.id)) {
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
        return {
          ...prev,
          market: prev.market.filter((item) => item.id !== selectedItem.id),
          messages: [
            ...prev.messages,
            createMessage("You ask for proof. The seller ghosts and pulls the listing.", "warning"),
          ],
        }
      }
      const repChange = selectedItem.scamRisk < 0.15 ? -1 : selectedItem.scamRisk >= 0.35 ? 1 : 0
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
  }

  const handleWalkAway = () => {
    addMessage("You walk away from the deal.", "info")
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const advanceDay = (
    prev: GameState,
    nextLocation: string,
    extraMessages: TerminalMessage[] = []
  ): GameState => {
    if (prev.day >= prev.totalDays) {
      return {
        ...prev,
        isGameOver: true,
        messages: [...prev.messages, ...extraMessages, createMessage("Final day reached. Game over!", "warning")],
      }
    }
    const nextDay = prev.day + 1
    const nextMarket = generateMarket(nextDay, nextLocation, prev.runSeed)
    const shiftMessage = getMarketShiftMessage(nextDay, nextLocation, prev.runSeed)
    const recapMessage = getMarketRecap(nextMarket)
    const cleanedFlipDays = prev.recentFlipDays.filter((day) => nextDay - day <= 5)
    const totalHeat = prev.inventory.reduce((sum, item) => sum + item.heatValue, 0)
    const hotItems = prev.inventory.filter((item) => item.heatValue >= 40)
    const recentFlips = cleanedFlipDays.filter((day) => nextDay - day <= 3).length
    const repoRisk = clamp(
      0.05 + totalHeat * 0.002 + hotItems.length * 0.05 + recentFlips * 0.06 - prev.reputation * 0.002,
      0,
      0.75
    )
    let nextInventory = prev.inventory
    let nextCash = prev.cash
    let nextReputation = prev.reputation
    const repoMessages: TerminalMessage[] = []
    const authMessages: TerminalMessage[] = []
    const luthierMessages: TerminalMessage[] = []
    const jamMessages: TerminalMessage[] = []

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
    if (prev.repoShield) {
      repoMessages.push(
        createMessage("You call in a favor. The market stays quiet tonight.", "success")
      )
    } else if (hotItems.length > 0 && Math.random() < finalRepoRisk) {
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

    const jamChance = 0.18
    if (Math.random() < jamChance) {
      const heatPenalty = prev.heatLevel === "High" ? 0.1 : prev.heatLevel === "Medium" ? 0.05 : 0
      const winChance = clamp(0.45 + prev.reputation * 0.003 - heatPenalty, 0.1, 0.85)
      if (Math.random() < winChance) {
        const tip = 120 + Math.floor(Math.random() * 180)
        nextCash += tip
        nextReputation = clamp(nextReputation + 2, 0, 100)
        jamMessages.push(
          createMessage("You win a sidewalk jam duel. A crowd tips you and a lead opens up.", "success"),
          createMessage(`You pick up $${tip} in tips.`, "success")
        )
      } else {
        nextReputation = clamp(nextReputation - 2, 0, 100)
        jamMessages.push(
          createMessage("You lose a quick jam duel. The crowd shrugs and moves on.", "warning")
        )
      }
    }

    return {
      ...prev,
      day: nextDay,
      location: nextLocation,
      market: nextMarket,
      cash: nextCash,
      reputation: nextReputation,
      inventory: nextInventory,
      heatLevel: computeHeatLevel(nextInventory),
      inspectedMarketIds: [],
      recentFlipDays: cleanedFlipDays,
      repoShield: false,
      messages: [
        ...prev.messages,
        ...extraMessages,
        createMessage(`Day ${nextDay} begins. New deals appear...`, "event"),
        createMessage(shiftMessage, "event"),
        createMessage(recapMessage, "info"),
        ...authMessages,
        ...luthierMessages,
        ...jamMessages,
        ...repoMessages,
      ],
    }
  }

  const handleTravel = (location: Location) => {
    setGameState((prev) => {
      const arrivalMessage =
        location.riskLevel === "High"
          ? createMessage("You feel eyes on you as you arrive.", "warning")
          : location.riskLevel === "Medium"
            ? createMessage("The area seems quiet. For now.", "event")
            : createMessage("You arrive without incident.", "success")
      return advanceDay(prev, location.name, [
        createMessage(`Traveling to ${location.name}... (${location.travelTime}h)`, "info"),
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

  const handleNewRun = () => {
    const newSeed =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString()
    const fresh = createInitialGameState(newSeed)
    setGameState(fresh)
    setShareStatus("idle")
    localStorage.removeItem(STORAGE_KEY)
    setHasSavedGame(false)
    setShowStartMenu(false)
  }

  const handleContinue = () => {
    setShowStartMenu(false)
  }

  const handleSell = (item: OwnedItem) => {
    setGameState((prev) => {
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

  const handleCallFavor = () => {
    setGameState((prev) => {
      if (prev.reputation < 8) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("Reputation too low to call in a favor.", "warning")],
        }
      }
      return {
        ...prev,
        reputation: clamp(prev.reputation - 8, 0, 100),
        favorTokens: prev.favorTokens + 1,
        messages: [...prev.messages, createMessage("You call in a favor. One quiet night banked.", "success")],
      }
    })
  }

  const handleUseFavor = () => {
    setGameState((prev) => {
      if (prev.favorTokens <= 0) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("No favors available to use.", "info")],
        }
      }
      if (prev.repoShield) {
        return {
          ...prev,
          messages: [...prev.messages, createMessage("A favor is already active tonight.", "info")],
        }
      }
      return {
        ...prev,
        favorTokens: prev.favorTokens - 1,
        repoShield: true,
        messages: [...prev.messages, createMessage("Favor queued. Repo pressure drops tonight.", "success")],
      }
    })
  }

  if (gameState.isGameOver) {
    const score = calculateScore(
      gameState.cash,
      gameState.inventory,
      gameState.market,
      gameState.reputation
    )
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-lg space-y-4">
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
              Trade guitars, amps, pedals, and parts across the city. Buy low, sell high, stay clean.
            </p>
          </div>
          <div className="space-y-2">
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
            <button
              onClick={() => setShowHelp((prev) => !prev)}
              className="w-full rounded-md border border-border bg-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Help
            </button>
          </div>
          {showHelp && (
            <div className="rounded-lg border border-border bg-card p-4 text-left text-sm text-muted-foreground">
              <p className="mb-2 text-foreground">How it works</p>
              <ul className="space-y-1">
                <li>Buy and sell gear each day to grow cash.</li>
                <li>Travel ends the day and moves you to a new market.</li>
                <li>Use "Ask for Proof" to reduce scam risk.</li>
                <li>Authenticate items to lower heat.</li>
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
      {/* Mobile Layout */}
      <div className="flex flex-1 flex-col lg:hidden">
        <Header />
        <StatusBar gameState={gameState} />
        <TerminalFeed messages={gameState.messages} terminalRef={terminalRef} />
        <MarketSection
          items={gameState.market}
          onItemSelect={handleItemSelect}
          showDeals={gameState.tools.priceGuide}
          isDeal={isSmokingDeal}
        />
        <ActionBar onAction={handleAction} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden h-dvh lg:grid lg:grid-cols-[280px_1fr_320px]">
        <aside className="flex flex-col border-r border-border bg-card p-4">
          <Header />
          <StatusBar gameState={gameState} className="mt-4" />
        </aside>
        <main className="flex flex-col overflow-hidden">
          <TerminalFeed messages={gameState.messages} terminalRef={terminalRef} className="flex-1" />
          <ActionBar onAction={handleAction} className="border-t border-border" />
        </main>
        <aside className="flex flex-col overflow-y-auto border-l border-border bg-card">
          <MarketSection
            items={gameState.market}
            onItemSelect={handleItemSelect}
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
                gameState.reputation
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

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        items={gameState.inventory}
        reputation={gameState.reputation}
        cash={gameState.cash}
        tools={gameState.tools}
        toolCosts={TOOL_COSTS}
        favorTokens={gameState.favorTokens}
        getSellPrice={(item) => getSellPrice(item, gameState.market, gameState.reputation)}
        getAuthCost={getAuthCost}
        getLuthierCost={getLuthierCost}
        onSell={handleSell}
        onAuthenticate={handleAuthenticate}
        onLuthier={handleLuthier}
        onBuyTool={handleBuyTool}
        onCallFavor={handleCallFavor}
        onUseFavor={handleUseFavor}
      />
    </div>
  )
}
