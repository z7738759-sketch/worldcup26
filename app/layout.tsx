import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'WC26 INSIGHT — 世界杯AI深度分析',
  description: '2026世界杯 · AI深度分析 · 赛后复盘 · 实时消息',
  metadataBase: new URL('https://worldcup-site-six.vercel.app'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" style={{ WebkitTextSizeAdjust: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#060d18" />
      </head>
      <body style={{ background: '#060d18', color: '#cdd9e5', minHeight: '100vh', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <Nav />
        <main style={{ minHeight: '80vh' }}>{children}</main>
      </body>
    </html>
  )
}
