'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '首页' },
  { href: '/match', label: '比赛' },
  { href: '/preview', label: '赛前' },
  { href: '/standings', label: '积分' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav style={{ background: 'rgba(6,13,24,0.97)', borderBottom: '1px solid #1e3a5f' }}
      className="sticky top-0 z-50 backdrop-blur px-3 sm:px-5 h-14 flex items-center gap-2 sm:gap-4">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, textDecoration: 'none' }}>
        <div style={{ background: 'linear-gradient(135deg,#f5a623,#e8890a)', boxShadow: '0 0 15px rgba(245,166,35,0.3)', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          🏆
        </div>
        <span className="hidden sm:inline font-black text-sm tracking-tight text-white">WC26 <span style={{ color: '#f5a623' }}>INSIGHT</span></span>
      </Link>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
        {links.map(l => {
          const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
          return (
            <Link key={l.href} href={l.href}
              style={{
                color: active ? '#f5a623' : '#8899aa',
                background: active ? '#1a2d45' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold hover:text-white hover:bg-[#1a2d45] transition-all">
              {l.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
