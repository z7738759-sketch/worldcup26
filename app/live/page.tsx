'use client'
import { useState, useEffect } from 'react'

interface LiveMatch {
  id: number
  homeTeam: { name: string }
  awayTeam: { name: string }
  status: string
  minute?: number
  score: { fullTime: { home: number | null; away: number | null } }
  group?: string
  predictionA?: string
  predictionB?: string
  mRules?: string[]
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  IN_PLAY: { label: '进行中', color: '#f87171', bg: '#7f1d1d' },
  PAUSED:  { label: '中场', color: '#fbbf24', bg: '#78350f' },
  FINISHED:{ label: '已结束', color: '#4ade80', bg: '#14532d' },
  SCHEDULED:{ label: '待开赛', color: '#6b7f96', bg: '#1e3a5f' },
}

export default function LivePage() {
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [lastUpdate, setLastUpdate] = useState('')
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'api' | 'predictions' | ''>('')

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/matches')
        const data = await res.json()
        setMatches(data.matches ?? [])
        setSource(data.source ?? '')
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [])

  const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
  const finished = matches.filter(m => m.status === 'FINISHED')
  const scheduled = matches.filter(m => m.status === 'SCHEDULED')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-black text-white">直播数据流</h1>
        <span style={{ background: '#b91c1c', fontSize: 10 }}
          className="text-white font-bold px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
      </div>
      <p style={{ color: '#6b7f96' }} className="text-sm mb-1">
        {source === 'api' ? '每30秒自动刷新 · football-data.org实时数据' : '今日赛程 · 含AI预测 · 每30秒检查更新'}
      </p>
      {lastUpdate && <p style={{ fontSize: 10, color: '#3d5470' }} className="mb-6">最后更新：{lastUpdate}</p>}

      {loading ? (
        <div style={{ color: '#6b7f96' }} className="text-center py-12">加载中…</div>
      ) : matches.length === 0 ? (
        <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">⚽</div>
          <div style={{ color: '#6b7f96' }} className="text-sm">今日暂无赛程</div>
        </div>
      ) : (
        <div className="space-y-4">
          {[...live, ...finished, ...scheduled].map(m => {
            const st = STATUS_MAP[m.status] ?? STATUS_MAP.SCHEDULED
            const hasScore = m.score?.fullTime?.home !== null
            return (
              <div key={m.id} style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }}
                className="rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: 10, color: '#6b7f96' }}>{m.group ?? ''}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                    background: st.bg, color: st.color }}
                    className={m.status === 'IN_PLAY' ? 'animate-pulse' : ''}>
                    {st.label}{m.minute ? ` ${m.minute}'` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex-1">{m.homeTeam?.name}</span>
                  {hasScore ? (
                    <span className="text-2xl font-black mx-4" style={{ color: m.status === 'FINISHED' ? '#4ade80' : '#f5a623' }}>
                      {m.score.fullTime.home} - {m.score.fullTime.away}
                    </span>
                  ) : (
                    <span className="text-sm mx-4" style={{ color: '#3d5470' }}>vs</span>
                  )}
                  <span className="font-bold text-white text-sm flex-1 text-right">{m.awayTeam?.name}</span>
                </div>
                {(m.predictionA || m.predictionB) && (
                  <div style={{ borderTop: '1px solid #1e3a5f', marginTop: 10, paddingTop: 8, fontSize: 11, color: '#6b7f96' }}>
                    预测：<span style={{ color: '#f5a623' }}>{m.predictionA}</span>
                    {m.predictionB && <> / {m.predictionB}</>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
