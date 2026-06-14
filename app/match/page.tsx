import Link from 'next/link'
import Image from 'next/image'
import { getAllPredictions } from '@/lib/predictions'
import { computeModelOutput } from '@/lib/model'
import { getFlagUrl } from '@/lib/match-utils'

function FlagImg({ team, size = 32 }: { team: string; size?: number }) {
  const url = getFlagUrl(team, '64x48')
  if (!url) return <div style={{ width: size, height: Math.round(size * 0.75), background: '#1e3a5f', borderRadius: 4, flexShrink: 0 }} />
  return <Image src={url} alt={team} width={size} height={Math.round(size * 0.75)} style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} unoptimized />
}

export default function MatchListPage() {
  const predictions = getAllPredictions()
  const now = new Date()
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const upcoming24h = predictions
    .filter(p => {
      if (p.actualScore !== null) return false
      const kickoff = new Date(p.kickoff)
      return kickoff > now && kickoff <= next24h
    })
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  const finished = predictions
    .filter(p => p.actualScore !== null)
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())

  const totalUpcoming = predictions.filter(p => p.actualScore === null).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚽</span>
          <span style={{ color: '#f5a623', fontSize: 13, letterSpacing: '3px' }} className="font-bold uppercase">Match Analysis</span>
        </div>
        <h1 className="text-3xl font-black mb-2 text-white">比赛分析</h1>
        <p style={{ color: '#8899aa' }} className="text-base">
          未来24小时内比赛（北京时间）· 共 {totalUpcoming} 场待开赛 · 点击查看完整推理链
        </p>
      </div>

      {/* 24h内待开赛 */}
      <section className="mb-12">
        <h2 style={{ fontSize: 14, color: '#f5a623', letterSpacing: '2px' }} className="font-bold uppercase mb-5 flex items-center gap-2">
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#f5a623', display: 'inline-block' }} />
          ⏳ 即将开赛 · 24小时内
        </h2>

        {upcoming24h.length === 0 ? (
          <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">⏰</div>
            <div style={{ color: '#8899aa', fontSize: 16 }}>未来24小时内暂无待开赛比赛</div>
            <Link href="/preview" style={{ color: '#f5a623', fontSize: 14, textDecoration: 'none', marginTop: 10, display: 'inline-block' }}>
              查看所有待分析场次 →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming24h.map(p => {
              const model = computeModelOutput(p.homeTeam, p.awayTeam, p.kickoff, { predictionA: p.predictionA, predictionB: p.predictionB })
              const kickoffBeijing = new Date(p.kickoff).toLocaleString('zh-CN', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai'
              })

              return (
                <Link key={p.matchId} href={`/match/${p.matchId}`}
                  style={{ background: 'linear-gradient(135deg, #0d1b2a, #0f1d30)', border: '1px solid #1e3a5f', display: 'block', textDecoration: 'none' }}
                  className="rounded-2xl hover:border-yellow-600/50 transition-all overflow-hidden">

                  <div className="p-5 sm:p-6">
                    {/* 顶行 */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 12, color: '#f5a623', fontWeight: 700, letterSpacing: '2px', background: '#1a2d45', padding: '3px 10px', borderRadius: 6 }}>
                          {p.group}
                        </span>
                        <span style={{ fontSize: 13, color: '#6b7f96' }}>
                          🕐 北京时间 {kickoffBeijing}
                        </span>
                      </div>
                    </div>

                    {/* 两队 */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <FlagImg team={p.homeTeam} size={36} />
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{p.homeTeam}</span>
                      </div>
                      <span style={{ color: '#3d5470', fontSize: 13, fontWeight: 700 }}>VS</span>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{p.awayTeam}</span>
                        <FlagImg team={p.awayTeam} size={36} />
                      </div>
                    </div>

                    {/* 预测 + 总进球 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                      <div style={{ background: '#070f1a', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#6b7f96', marginBottom: 6 }}>预测 A</div>
                        <div style={{ color: '#f5a623', fontWeight: 900, fontSize: 15 }}>{p.predictionA}</div>
                      </div>
                      <div style={{ background: '#070f1a', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#6b7f96', marginBottom: 6 }}>预测 B</div>
                        <div style={{ color: '#60a5fa', fontWeight: 900, fontSize: 15 }}>{p.predictionB}</div>
                      </div>
                      <div style={{ background: '#070f1a', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#6b7f96', marginBottom: 6 }}>总进球</div>
                        <div style={{ color: '#cdd9e5', fontWeight: 900, fontSize: 15 }}>{model.totalGoalsA}~{model.totalGoalsB}球</div>
                      </div>
                    </div>

                    {/* 胜平负概率条 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                        <span style={{ color: '#4ade80' }}>{p.homeTeam} {model.homeWinPct}%</span>
                        <span style={{ color: '#f5a623' }}>平 {model.drawPct}%</span>
                        <span style={{ color: '#60a5fa' }}>{p.awayTeam} {model.awayWinPct}%</span>
                      </div>
                      <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', background: '#070f1a' }}>
                        <div style={{ width: `${model.homeWinPct}%`, background: 'linear-gradient(90deg,#15803d,#22c55e)' }} />
                        <div style={{ width: `${model.drawPct}%`, background: 'linear-gradient(90deg,#b45309,#f59e0b)' }} />
                        <div style={{ width: `${model.awayWinPct}%`, background: 'linear-gradient(90deg,#1d4ed8,#60a5fa)' }} />
                      </div>
                    </div>

                    {/* teamNews */}
                    {p.teamNews && p.teamNews.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a2d45' }}>
                        {p.teamNews.slice(0, 3).map((news, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.7 }}>{news}</div>
                        ))}
                        {p.teamNews.length > 3 && (
                          <div style={{ fontSize: 11, color: '#6b7f96', marginTop: 4 }}>+{p.teamNews.length - 3} 条更多情报</div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 已完成比赛 - 简洁列表 */}
      {finished.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, color: '#22c55e', letterSpacing: '2px' }} className="font-bold uppercase mb-5 flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />
            ✅ 已完成 · 赛后复盘
          </h2>
          <div className="space-y-2.5">
            {finished.slice(0, 10).map(p => {
              const kickoffBeijing = new Date(p.kickoff).toLocaleString('zh-CN', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai'
              })
              return (
                <Link key={p.matchId} href={`/match/${p.matchId}`}
                  style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', display: 'block', textDecoration: 'none' }}
                  className="rounded-xl p-4 hover:border-yellow-600/40 transition-all">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span style={{ fontSize: 12, color: '#6b7f96', minWidth: 64, flexShrink: 0 }}>{kickoffBeijing}</span>
                    <span style={{ fontSize: 11, color: '#f5a623', fontWeight: 700, minWidth: 40, flexShrink: 0 }}>{p.group}</span>
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{p.homeTeam}</span>
                    <span style={{ color: '#f5a623', fontWeight: 900, fontSize: 16 }}>{p.actualScore}</span>
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{p.awayTeam}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, flexShrink: 0 }}>
                      {p.exactHit
                        ? <span style={{ color: '#4ade80' }}>🎯 完全命中</span>
                        : p.directionCorrect
                          ? <span style={{ color: '#60a5fa' }}>✅ 方向正确</span>
                          : <span style={{ color: '#ef4444' }}>❌ 方向错误</span>
                      }
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
