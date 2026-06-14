import type { BettingValue } from '@/lib/types'

export default function BettingCards({ values }: { values: BettingValue[] }) {
  if (!values.length) return null
  return (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-5">
      <h3 style={{ color: '#6b7f96', fontSize: 10 }} className="font-bold tracking-widest uppercase mb-4">💰 博彩价值评估</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {values.map((v, i) => (
          <div key={i}
            style={{ background: '#070f1a', border: `1px solid ${v.stars === 3 ? '#f5a623' : '#1e3a5f'}` }}
            className="rounded-xl p-4">
            <div style={{ fontSize: 10, color: '#f5a623' }} className="mb-1">
              {'⭐'.repeat(v.stars)} {v.stars === 3 ? '最高价值' : '次选'}
            </div>
            <div className="font-bold text-sm text-white mb-1">{v.name}</div>
            <div style={{ fontSize: 22, color: '#f5a623' }} className="font-black mb-1">{v.odds}</div>
            <div style={{ fontSize: 11, color: '#6b7f96', lineHeight: 1.5 }} className="mb-2">{v.logic}</div>
            <div style={{ fontSize: 10, color: '#3d5470', fontFamily: 'monospace' }} className="mb-2">{v.evCalc}</div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 9999,
              background: v.status === 'hit' ? '#14532d' : v.status === 'miss' ? '#7f1d1d' : 'rgba(120,80,0,0.3)',
              color: v.status === 'hit' ? '#4ade80' : v.status === 'miss' ? '#f87171' : '#f5a623',
            }}>
              {v.status === 'hit' ? '✓ 命中' : v.status === 'miss' ? '✗ 未中' : '● 待结果'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
