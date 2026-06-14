import { getAllPredictions } from '@/lib/predictions'

export default function AnalysisHighlightsPage() {
  const predictions = getAllPredictions()
  const allHighlights = predictions.flatMap(p =>
    p.bettingValues.map(b => ({ ...b, match: `${p.homeTeam} vs ${p.awayTeam}`, matchId: p.matchId, group: p.group, actualScore: p.actualScore }))
  ).sort((a, b) => b.stars - a.stars)

  const star3 = allHighlights.filter(b => b.stars === 3)
  const resolved = star3.filter(b => b.hit !== null && b.hit !== undefined)
  const hits = resolved.filter(b => b.hit === true).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2 text-white">重点关注场次</h1>
      <p style={{ color: '#8899aa' }} className="text-base mb-6">高信心度场次汇总 · 赛后自动核实 · 持续追踪分析准确率</p>

      {resolved.length > 0 && (
        <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', fontSize: 15 }}
          className="rounded-2xl p-6 mb-8 text-center">
          <div className="text-lg mb-1" style={{ color: '#8899aa' }}>高信心场次命中率</div>
          <div className="text-4xl font-black" style={{ color: '#f5a623' }}>{hits}/{resolved.length}</div>
          <div style={{ fontSize: 13, color: '#6b7f96' }}>{Math.round(hits / resolved.length * 100)}%</div>
        </div>
      )}

      <div className="space-y-3">
        {allHighlights.map((b, i) => (
          <div key={i} style={{ background: '#0d1b2a', border: `1px solid ${b.stars === 3 ? '#f5a623' : '#1e3a5f'}`, opacity: b.actualScore ? 0.6 : 1 }}
            className="rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div style={{ fontSize: 12, color: '#6b7f96' }} className="mb-1">{b.group} · {b.match}</div>
              <div className="font-bold text-base text-white mb-1">{'⭐'.repeat(b.stars)} {b.name}</div>
              <div style={{ fontSize: 13, color: '#8899aa' }}>{b.actualScore ? `实际结果：${b.actualScore}` : '待开赛'}</div>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 9999, flexShrink: 0,
              background: b.hit === true ? '#14532d' : b.hit === false ? '#7f1d1d' : '#1a2d45',
              color: b.hit === true ? '#4ade80' : b.hit === false ? '#ef4444' : '#f5a623',
            }}>
              {b.hit === true ? '✓ 命中' : b.hit === false ? '✗ 未中' : '待结果'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
