interface Props {
  homeWinPct: number
  drawPct: number
  awayWinPct: number
  expectedGoalsHome: number
  expectedGoalsAway: number
  eloHome: number
  eloAway: number
  totalGoalsA?: number
  totalGoalsB?: number
  mostLikelyScore?: string
  homeTeam: string
  awayTeam: string
}

export default function ModelScoreBar(props: Props) {
  const eloDiff = props.eloHome - props.eloAway
  const total = props.homeWinPct + props.drawPct + props.awayWinPct || 1

  return (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-2xl p-6">
      <h3 style={{ color: '#8899aa', fontSize: 12 }} className="font-bold tracking-widest uppercase mb-5 flex items-center gap-2">
        <span style={{ fontSize: 16 }}>📐</span>
        <span>综合实力评估 · 球队数据库深度分析</span>
      </h3>

      {/* 胜平负概率条 */}
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, fontWeight: 700 }}>
          <span style={{ color: '#4ade80' }}>{props.homeTeam} 胜 {Math.round(props.homeWinPct * 100 / total)}%</span>
          <span style={{ color: '#f5a623' }}>平局 {Math.round(props.drawPct * 100 / total)}%</span>
          <span style={{ color: '#60a5fa' }}>{props.awayTeam} 胜 {Math.round(props.awayWinPct * 100 / total)}%</span>
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 9999, overflow: 'hidden', background: '#070f1a' }}>
          <div style={{ width: `${props.homeWinPct * 100 / total}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', transition: 'width 0.4s' }} />
          <div style={{ width: `${props.drawPct * 100 / total}%`, background: 'linear-gradient(90deg,#d97706,#f59e0b)', transition: 'width 0.4s' }} />
          <div style={{ width: `${props.awayWinPct * 100 / total}%`, background: 'linear-gradient(90deg,#2563eb,#60a5fa)', transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* 数据卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard label="主队预期进球" value={String(props.expectedGoalsHome)} color="#4ade80" />
        <StatCard label="客队预期进球" value={String(props.expectedGoalsAway)} color="#60a5fa" />
        <StatCard
          label="总进球预测"
          value={props.totalGoalsA !== undefined ? `${props.totalGoalsA}球` : '—'}
          color="#cdd9e5"
          sub={props.totalGoalsB !== undefined ? `次可能：${props.totalGoalsB}球` : undefined}
        />
        <StatCard
          label="最可能比分"
          value={props.mostLikelyScore || '—'}
          color="#f5a623"
          sub={`实力差${eloDiff > 0 ? '+' : ''}${eloDiff}分`}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: '#070f1a', border: '1px solid #0d1e30', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#6b7f96', marginBottom: 6, letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7f96', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}
