'use client'
import { usePathname, useRouter } from 'next/navigation'

// ── Icons ──────────────────────────────────────────────────────────────────
export const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
export const GridIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
  </svg>
)
export const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)
export const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
export const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
)
export const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)
export const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
export const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
export const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
  </svg>
)
export const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </svg>
)
export const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
)
export const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)

// ── Shared components ──────────────────────────────────────────────────────
export const IconBtn = ({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      width: 34, height: 34, borderRadius: 10,
      background: '#242220', border: '1px solid #3A3835',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#9A9590',
    }}
  >
    {children}
  </button>
)

export const StatusBar = () => (
  <div style={{
    height: 44, padding: '0 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  }}>
    <span style={{ fontSize: 13, fontWeight: 600 }}>9:41</span>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="#F2EDE6">
        <rect x="0" y="4" width="3" height="8" rx="1"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1"/>
        <rect x="9" y="1" width="3" height="11" rx="1"/><rect x="13.5" y="0" width="2.5" height="12" rx="1"/>
      </svg>
      <svg width="16" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2EDE6" strokeWidth="2">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="#F2EDE6"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600 }}>100%</span>
    </div>
  </div>
)

export const AppHeader = ({
  title, subtitle, onBack, actions,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: React.ReactNode
}) => (
  <div style={{
    background: '#1A1917', borderBottom: '1px solid #3A3835',
    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  }}>
    {onBack && <IconBtn onClick={onBack}><ChevronLeft /></IconBtn>}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#F2EDE6' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: '#6A6560' }}>{subtitle}</div>}
    </div>
    {actions}
  </div>
)

const NAV_ITEMS = [
  { href: '/discover',   icon: <HomeIcon />,  label: 'Home'    },
  { href: '/floor-plan', icon: <GridIcon />,  label: 'Plan'    },
  { href: '/wall-view',  icon: <PlusIcon />,  label: 'Design'  },
  { href: '/profile',    icon: <UserIcon />,  label: 'Profile' },
]

export const BottomNav = () => {
  const pathname = usePathname()
  const router   = useRouter()

  return (
    <div style={{
      height: 72, borderTop: '1px solid #2A2825',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      background: '#141210', flexShrink: 0, paddingBottom: 8,
    }}>
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', padding: '8px 16px',
              color: active ? '#C8A96E' : '#4A4845',
              transition: 'color 0.15s',
            }}
          >
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.3px' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export const Spinner = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{
      width: 24, height: 24,
      border: '2px solid #C8A96E', borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
  </div>
)
