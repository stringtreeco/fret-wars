"use client"

import { MapPin, Clock, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface Location {
  id: string
  name: string
  description: string
  riskLevel: "Low" | "Medium" | "High"
  travelTime: number
}

const locations: Location[] = [
  {
    id: "downtown",
    name: "Downtown Music Row",
    description: "The main strip. Safe deals, fair prices.",
    riskLevel: "Low",
    travelTime: 1,
  },
  {
    id: "vintage",
    name: "Vintage Alley",
    description: "Old stock, rare finds. Authenticity varies.",
    riskLevel: "Medium",
    travelTime: 2,
  },
  {
    id: "warehouse",
    name: "The Warehouse District",
    description: "Bulk deals and estate sales. Watch your back.",
    riskLevel: "High",
    travelTime: 3,
  },
  {
    id: "suburbs",
    name: "Suburban Pawn Shops",
    description: "Hidden gems among the junk. Slow moving.",
    riskLevel: "Low",
    travelTime: 2,
  },
  {
    id: "underground",
    name: "The Underground",
    description: "No questions asked. High risk, high reward.",
    riskLevel: "High",
    travelTime: 4,
  },
]

interface TravelModalProps {
  isOpen: boolean
  currentLocation: string
  onClose: () => void
  onTravel: (location: Location) => void
}

export function TravelModal({ isOpen, currentLocation, onClose, onTravel }: TravelModalProps) {
  const getRiskColor = (risk: Location["riskLevel"]) => {
    switch (risk) {
      case "Low":
        return "text-primary"
      case "Medium":
        return "text-accent"
      case "High":
        return "text-destructive"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            Travel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Current: <span className="text-foreground">{currentLocation}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Select your destination. Travel takes time and may attract attention.
          </p>
        </div>

        <div className="mt-2 space-y-2">
          {locations.map((location) => {
            const isCurrent = location.name === currentLocation
            return (
              <button
                key={location.id}
                disabled={isCurrent}
                onClick={() => onTravel(location)}
                className={`w-full rounded border p-3 text-left transition-colors ${
                  isCurrent
                    ? "cursor-not-allowed border-border bg-muted/50 opacity-50"
                    : "border-border bg-secondary hover:border-primary hover:bg-secondary/80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {location.name}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                          HERE
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {location.description}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {location.travelTime}h
                  </span>
                  <span className={`flex items-center gap-1 ${getRiskColor(location.riskLevel)}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {location.riskLevel} Risk
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground bg-transparent"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
