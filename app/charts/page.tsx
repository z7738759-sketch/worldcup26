import predictionsData from '@/data/predictions.json'
import modelStateData from '@/data/model-state.json'
import type { Prediction } from '@/lib/types'

interface MS {
  elo: Record<string, number>
  globalStats: { directionAccuracy: number; exactHitRate: number; totalCompleted: number }
}

// ── SVG Chart Components (pure, no dependencies) ──────────────

function HBarChart({ rows, base, top, color }: {
  rows: [string, number][]
  base: number; top: number; color: string
}) {
  const W = 560, rowH = 26, LW = 96, VW = 46
  const BAR = W - LW - VW
  const H = rows.length * rowH + 8
  const range = top - base

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {rows.map(([name, val], i) => {
        const bw = Math.max(6, ((val - base) / range) * BAR)
        const y = i * rowH + 4
        return (
          <g key={name}>
            <text x={LW - 6} y={y + 17} textAnchor="end" fontSize={11}
              fill={i < 3 ? '#e2eaf3' : '#8899aa'} fontFamily="system-ui,sans-serif">
              {i + 1}. {name}
            </text>
            <rect x={LW} y={y + 5} width={bw} height={16} fill={color} rx={3}
              opacity={i < 3 ? 0.95 : i < 8 ? 0.72 : 0.48} />
            <text x={LW + bw + 5} y={y + 17} fill="#cdd9e5" fontSize={10}
              fontFamily="system-ui,sans-serif">
              {val}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ series, n }: {
  series: { name: string; color: string; vals: number[] }[]
  n: number
}) {
  const W = 560, H = 178
  const P = { t: 14, r: 62, b: 34, l: 36 }
  const cW = W - P.l - P.r, cH = H - P.t - P.b
  const px = (i: number) => (P.l + (i / Math.max(n - 1, 1)) * cW).toFixed(1)
  const py = (v: number) => (P.t + cH - (v / 100) * cH).toFixed(1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[25, 50, 75, 100].map(g => (
        <g key={g}>
          <line x1={P.l} y1={py(g)} x2={P.l + cW} y2={py(g)}
            stroke="#1e3a5f" strokeWidth={1} strokeDasharray="4 3" />
          <text x={P.l - 5} y={+py(g) + 4} textAnchor="end" fill="#6b7f96"
            fontSize={9} fontFamily="system-ui,sans-serif">{g}%</text>
        </g>
      ))}
      {[0, 7, 15, 23, 31].filter(i => i < n).map(i => (
        <text key={i} x={px(i)} y={H - P.b + 14} textAnchor="middle"
          fill="#6b7f96" fontSize={9} fontFamily="system-ui,sans-serif">
          #{i + 1}
        </text>
      ))}
      {series.map(s => {
        const last = s.vals[n - 1]
        return (
          <g key={s.name}>
            <polyline
              points={s.vals.map((v, i) => `${px(i)},${py(v)}`).join(' ')}
              fill="none" stroke={s.color} strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={px(n - 1)} cy={py(last)} r={4} fill={s.color} />
            <text x={+px(n - 1) + 7} y={+py(last) + 4} fill={s.color}
              fontSize={11} fontWeight="bold" fontFamily="system-ui,sans-serif">
              {last}%
            </text>
          </g>
        )
      })}
      {series.map((s, i) => (
        <g key={s.name}>
          <line x1={P.l + i * 140} y1={H - 8} x2={P.l + i * 140 + 18} y2={H - 8}
            stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
          <text x={P.l + i * 140 + 23} y={H - 4} fill={s.color}
            fontSize={10} fontFamily="system-ui,sans-serif">{s.name}</text>
        </g>
      ))}
    </svg>
  )
}

function ScatterChart({ pts, maxG }: {
  pts: { pred: number; actual: number }[]
  maxG: number
}) {
  const W = 300, H = 256
  const P = { t: 12, r: 12, b: 44, l: 34 }
  const cW = W - P.l - P.r, cH = H - P.t - P.b
  const sx = (v: number) => (P.l + (v / maxG) * cW).toFixed(1)
  const sy = (v: number) => (H - P.b - (v / maxG) * cH).toFixed(1)
  const ticks = [2, 4, 6, 8].filter(t => t <= maxG)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={sx(t)} y1={P.t} x2={sx(t)} y2={H - P.b}
            stroke="#1e3a5f" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={P.l} y1={sy(t)} x2={W - P.r} y2={sy(t)}
            stroke="#1e3a5f" strokeWidth={1} strokeDasharray="3 3" />
          <text x={sx(t)} y={H - P.b + 13} textAnchor="middle"
            fill="#6b7f96" fontSize={9} fontFamily="system-ui,sans-serif">{t}</text>
          <text x={P.l - 4} y={+sy(t) + 4} textAnchor="end"
            fill="#6b7f96" fontSize={9} fontFamily="system-ui,sans-serif">{t}</text>
        </g>
      ))}
      {/* Perfect prediction diagonal */}
      <line x1={sx(0)} y1={sy(0)} x2={sx(maxG)} y2={sy(maxG)}
        stroke="#2a4060" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={+sx(maxG - 0.5)} y={+sy(maxG - 0.5) - 5}
        textAnchor="end" fill="#3a5070" fontSize={8} fontFamily="system-ui,sans-serif">完美预测线</text>
      {/* Data points */}
      {pts.map((p, i) => {
        const c = p.actual > p.pred + 0.5 ? '#ef4444'
          : p.actual < p.pred - 0.5 ? '#60a5fa' : '#4ade80'
        return <circle key={i} cx={sx(p.pred)} cy={sy(p.actual)} r={4.5}
          fill={c} opacity={0.75} />
      })}
      {/* Axis labels */}
      <text x={P.l + cW / 2} y={H - 4} textAnchor="middle"
        fill="#8899aa" fontSize={9} fontFamily="system-ui,sans-serif">预测进球 (λ主+λ客)</text>
      <text x={10} y={P.t + cH / 2} textAnchor="middle"
        fill="#8899aa" fontSize={9} fontFamily="system-ui,sans-serif"
        transform={`rotate(-90, 10, ${P.t + cH / 2})`}>实际进球</text>
      {/* Legend */}
      {[
        { c: '#ef4444', label: '低估进球' },
        { c: '#60a5fa', label: '高估进球' },
        { c: '#4ade80', label: '精确' },
      ].map(({ c, label }, i) => (
        <g key={label}>
          <circle cx={P.l + i * 60} cy={H - P.b + 28} r={4} fill={c} opacity={0.8} />
          <text x={P.l + i * 60 + 8} y={H - P.b + 33}
            fill={c} fontSize={9} fontFamily="system-ui,sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  )
}

function MRuleChart({ rules }: {
  rules: [string, { n: number; correct: number }][]
}) {
  const W = 560, rowH = 30, LW = 100, VW = 90
  const BAR = W - LW - VW
  const maxN = Math.max(...rules.map(([, v]) => v.n), 1)
  const H = rules.length * rowH + 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {rules.map(([rule, { n, correct }], i) => {
        const y = i * rowH + 4
        const tw = (n / maxN) * BAR
        const hw = (correct / maxN) * BAR
        const pct = Math.round((correct / n) * 100)
        return (
          <g key={rule}>
            <text x={LW - 6} y={y + 20} textAnchor="end"
              fill="#8899aa" fontSize={11} fontFamily="system-ui,sans-serif">{rule}</text>
            <rect x={LW} y={y + 8} width={tw} height={14} fill="#1e3a5f" rx={2} />
            <rect x={LW} y={y + 8} width={hw} height={14} fill="#22d3ee" rx={2} opacity={0.82} />
            <text x={LW + tw + 6} y={y + 20} fill="#cdd9e5"
              fontSize={10} fontFamily="system-ui,sans-serif">
              {correct}/{n} ({pct}%)
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ResultChart({ data }: {
  data: { label: string; actual: number; pred: number; color: string }[]
}) {
  const W = 300, H = 200
  const P = { t: 16, r: 16, b: 42, l: 30 }
  const cW = W - P.l - P.r, cH = H - P.t - P.b
  const maxV = Math.max(...data.map(d => Math.max(d.actual, d.pred)), 1)
  const gW = cW / data.length
  const bW = gW * 0.32
  const yv = (v: number) => P.t + cH - (v / maxV) * cH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[Math.round(maxV / 2), maxV].map(g => (
        <g key={g}>
          <line x1={P.l} y1={yv(g)} x2={P.l + cW} y2={yv(g)}
            stroke="#1e3a5f" strokeWidth={1} strokeDasharray="3 2" />
          <text x={P.l - 4} y={yv(g) + 4} textAnchor="end"
            fill="#6b7f96" fontSize={9} fontFamily="system-ui,sans-serif">{g}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = P.l + i * gW + gW / 2
        const aH = (d.actual / maxV) * cH
        const pH = (d.pred / maxV) * cH
        return (
          <g key={d.label}>
            <rect x={cx - bW - 2} y={yv(d.actual)} width={bW} height={aH}
              fill={d.color} rx={2} opacity={0.9} />
            <text x={cx - bW / 2 - 2} y={yv(d.actual) - 4} textAnchor="middle"
              fill={d.color} fontSize={12} fontWeight="bold" fontFamily="system-ui,sans-serif">
              {d.actual}
            </text>
            <rect x={cx + 2} y={yv(d.pred)} width={bW} height={pH}
              fill={d.color} rx={2} opacity={0.3} />
            <text x={cx + bW / 2 + 2} y={yv(d.pred) - 4} textAnchor="middle"
              fill={d.color} fontSize={12} fontFamily="system-ui,sans-serif" opacity={0.6}>
              {d.pred}
            </text>
            <text x={cx} y={H - P.b + 14} textAnchor="middle"
              fill="#8899aa" fontSize={11} fontFamily="system-ui,sans-serif">{d.label}</text>
          </g>
        )
      })}
      <rect x={P.l} y={H - 10} width={9} height={7} fill="#888" rx={1} opacity={0.9} />
      <text x={P.l + 12} y={H - 4} fill="#8899aa" fontSize={9} fontFamily="system-ui,sans-serif">实际</text>
      <rect x={P.l + 44} y={H - 10} width={9} height={7} fill="#888" rx={1} opacity={0.3} />
      <text x={P.l + 56} y={H - 4} fill="#8899aa" fontSize={9} fontFamily="system-ui,sans-serif">预测</text>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function ChartsPage() {
  const ms = modelStateData as unknown as MS
  const finished = (predictionsData as Prediction[])
    .filter((p): p is Prediction & { actualScore: string } => p.actualScore !== null)
    .sort((a, b) => a.matchId - b.matchId)

  const n = finished.length
  const dirPct = Math.round(ms.globalStats.directionAccuracy * 100)
  const exactPct = Math.round(ms.globalStats.exactHitRate * 100)
  const dirHits = Math.round(ms.globalStats.directionAccuracy * n)
  const exactHits = Math.round(ms.globalStats.exactHitRate * n)

  // 1. ELO top 16
  const topElo = Object.entries(ms.elo).sort(([, a], [, b]) => b - a).slice(0, 16)

  // 2. Cumulative accuracy timeline
  let dRunning = 0, eRunning = 0
  const cumAcc = finished.map((p, i) => {
    if (p.directionCorrect) dRunning++
    if (p.exactHit) eRunning++
    return {
      dir: Math.round((dRunning / (i + 1)) * 100),
      exact: Math.round((eRunning / (i + 1)) * 100),
    }
  })

  // 3. Goals scatter: lambda sum vs actual
  const goalsScatter = finished
    .filter((p): p is typeof p & { lambdaHome: number; lambdaAway: number } =>
      p.lambdaHome != null && p.lambdaAway != null)
    .map(p => {
      const [h, a] = p.actualScore.split('-').map(Number)
      return { pred: +(p.lambdaHome + p.lambdaAway).toFixed(1), actual: h + a }
    })
  const maxG = goalsScatter.length > 0
    ? Math.max(Math.ceil(Math.max(...goalsScatter.map(p => Math.max(p.pred, p.actual)))), 8)
    : 8
  const avgPred = goalsScatter.length > 0
    ? (goalsScatter.reduce((s, p) => s + p.pred, 0) / goalsScatter.length).toFixed(1)
    : '-'
  const avgActual = goalsScatter.length > 0
    ? (goalsScatter.reduce((s, p) => s + p.actual, 0) / goalsScatter.length).toFixed(1)
    : '-'

  // 4. M-rule stats
  const mStats: Record<string, { n: number; correct: number }> = {}
  for (const p of finished) {
    for (const rule of p.mRulesTriggered) {
      if (!mStats[rule]) mStats[rule] = { n: 0, correct: 0 }
      mStats[rule].n++
      if (p.directionCorrect) mStats[rule].correct++
    }
  }
  const topRules = Object.entries(mStats).sort(([, a], [, b]) => b.n - a.n)
  const bestRule = topRules.length > 0
    ? topRules.reduce((best, cur) =>
        cur[1].correct / cur[1].n > best[1].correct / best[1].n ? cur : best)
    : null

  // 5. Result distribution
  const aD = { home: 0, draw: 0, away: 0 }
  const pD = { home: 0, draw: 0, away: 0 }
  for (const p of finished) {
    const [h, a] = p.actualScore.split('-').map(Number)
    if (h > a) aD.home++
    else if (h < a) aD.away++
    else aD.draw++
    if (p.winDrawLoss === 'home') pD.home++
    else if (p.winDrawLoss === 'away') pD.away++
    else if (p.winDrawLoss === 'draw') pD.draw++
  }

  const card = (children: React.ReactNode, title: string, titleColor: string, sub: string) => (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ color: titleColor, fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: '#6b7f96', fontSize: 11, marginBottom: 16 }}>{sub}</div>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6 }}>数据可视化</h1>
      <p style={{ color: '#8899aa', fontSize: 14, marginBottom: 24 }}>
        2026 世界杯 AI 预测模型 · {n} 场已完成分析
      </p>

      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '已完成场次', val: `${n}`, color: '#60a5fa', sub: '场' },
          { label: '方向准确率', val: `${dirPct}%`, color: '#4ade80', sub: `${dirHits}/${n} 场命中` },
          { label: '比分精确率', val: `${exactPct}%`, color: '#f5a623', sub: `${exactHits}/${n} 场命中` },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0d1b2a', border: `1px solid ${s.color}28`,
            borderRadius: 14, padding: '16px 18px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#8899aa', fontWeight: 700, letterSpacing: '1px', marginTop: 6, textTransform: 'uppercase' as const }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11, color: '#6b7f96', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Chart 1: ELO Rankings */}
        {card(
          <HBarChart rows={topElo} base={1600} top={2200} color="#f5a623" />,
          '🏅 ELO 实力排名（前16强）',
          '#f5a623',
          `实时校正评分 · 基准 1600 · ${topElo[0]?.[0] ?? ''} ${topElo[0]?.[1] ?? ''} 领跑`
        )}

        {/* Chart 2: Accuracy Timeline */}
        {card(
          <LineChart
            series={[
              { name: '胜平负方向', color: '#4ade80', vals: cumAcc.map(c => c.dir) },
              { name: '比分精确', color: '#f5a623', vals: cumAcc.map(c => c.exact) },
            ]}
            n={n}
          />,
          '📈 预测准确率时间线（累计）',
          '#4ade80',
          '每场赛后滚动更新的累计准确率 · X轴=场次编号'
        )}

        {/* Charts 3 + 5 side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) minmax(200px,1fr)', gap: 16 }}>
          {card(
            <>
              <ScatterChart pts={goalsScatter} maxG={maxG} />
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#8899aa' }}>均值预测 <strong style={{ color: '#60a5fa' }}>{avgPred}</strong> 球</span>
                <span style={{ fontSize: 11, color: '#8899aa' }}>均值实际 <strong style={{ color: '#4ade80' }}>{avgActual}</strong> 球</span>
              </div>
            </>,
            '⚽ 进球预测 vs 实际散点图',
            '#60a5fa',
            '每个点=一场比赛 · 对角线以上=低估进球'
          )}
          {card(
            <ResultChart data={[
              { label: '主场胜', actual: aD.home, pred: pD.home, color: '#4ade80' },
              { label: '平局', actual: aD.draw, pred: pD.draw, color: '#f5a623' },
              { label: '客场胜', actual: aD.away, pred: pD.away, color: '#ef4444' },
            ]} />,
            '📊 胜平负分布对比',
            '#a78bfa',
            '深色=实际结果，浅色=模型预测方向'
          )}
        </div>

        {/* Chart 4: M-Rule stats */}
        {topRules.length > 0 && card(
          <>
            <MRuleChart rules={topRules} />
            {bestRule && (
              <div style={{ marginTop: 12, fontSize: 11, color: '#8899aa' }}>
                命中率最高规则：
                <strong style={{ color: '#22d3ee' }}> {bestRule[0]}</strong>
                {' '}({bestRule[1].correct}/{bestRule[1].n} = {Math.round(bestRule[1].correct / bestRule[1].n * 100)}%)
              </div>
            )}
          </>,
          '🔬 M规则触发命中统计',
          '#22d3ee',
          '青色=方向命中场次，蓝色背景=总触发次数'
        )}

      </div>
    </div>
  )
}
