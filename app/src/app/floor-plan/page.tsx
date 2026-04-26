import { StatusBar, BottomNav } from '@/components/SharedUI'

export default function FloorPlanPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StatusBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A4845', fontSize: 14 }}>
        Floor Plan — coming soon
      </div>
      <BottomNav />
    </div>
  )
}
