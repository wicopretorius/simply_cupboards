import type { AppRole } from './types'

export interface TierLimits {
  designs: number      // -1 = unlimited
  cabinets: number     // -1 = unlimited
  print2d: boolean
  cuttingList: boolean
  pricing: boolean
  canDesign: boolean   // false for Client role
}

export const TIER_LIMITS: Record<AppRole, TierLimits> = {
  Free:          { designs: 1,  cabinets: 15, print2d: false, cuttingList: false, pricing: false, canDesign: true  },
  User:          { designs: 5,  cabinets: -1, print2d: true,  cuttingList: false, pricing: false, canDesign: true  },
  Designer:      { designs: 10, cabinets: -1, print2d: true,  cuttingList: true,  pricing: false, canDesign: true  },
  Business:      { designs: -1, cabinets: -1, print2d: true,  cuttingList: true,  pricing: true,  canDesign: true  },
  Client:        { designs: 0,  cabinets: 0,  print2d: false, cuttingList: false, pricing: true,  canDesign: false },
  Admin:         { designs: -1, cabinets: -1, print2d: true,  cuttingList: true,  pricing: true,  canDesign: true  },
  Administrator: { designs: -1, cabinets: -1, print2d: true,  cuttingList: true,  pricing: true,  canDesign: true  },
}

export function getLimits(role: AppRole | null): TierLimits {
  if (!role) return TIER_LIMITS.Free
  return TIER_LIMITS[role] ?? TIER_LIMITS.Free
}

export function atDesignLimit(role: AppRole | null, currentCount: number): boolean {
  const { designs } = getLimits(role)
  return designs !== -1 && currentCount >= designs
}

export function atCabinetLimit(role: AppRole | null, currentCount: number): boolean {
  const { cabinets } = getLimits(role)
  return cabinets !== -1 && currentCount >= cabinets
}

export function upgradeMessage(role: AppRole | null, feature: 'designs' | 'cabinets' | 'print2d' | 'cuttingList' | 'pricing'): string {
  const messages: Record<string, string> = {
    designs:     'Upgrade your plan to create more designs.',
    cabinets:    'Upgrade your plan to add more cabinets.',
    print2d:     'Upgrade to User or higher to print 2D designs.',
    cuttingList: 'Upgrade to Designer or higher to access cutting lists.',
    pricing:     'Upgrade to Business to access store pricing.',
  }
  return messages[feature] ?? 'Upgrade your plan to access this feature.'
}
