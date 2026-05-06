import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'DM Cupboards',
  description: 'Design My Cupboards',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <div style={{
          width: '100%',
          maxWidth: 430,
          height: '100dvh',
          background: '#0F0F0E',
          color: '#F2EDE6',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      </body>
    </html>
  )
}
