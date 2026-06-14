'use client'
import { useState, useEffect } from 'react'

interface Props {
  matchId: number
  initialStatus: string
}

interface LiveEvent {
  minute: number
  type: string
  player: string
  team: string
}

export default function LiveScore({ matchId, initialStatus }: Props) {
  const [score, setScore] = useState<{ home: number | null; away: number | null }>({ home: null, away: null })
  const [status, setStatus] = useState(initialStatus)
  const [minute, setMinute] = useState<number>()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (status === 'FINISHED') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/live-score?id=${matchId}`)
        const data = await res.json()
        if (data.match) {
          setScore(data.match.score?.fullTime ?? { home: null, away: null })
          setStatus(data.match.status)
          setMinute(data.match.minute)
          setLastUpdated(new Date())
        }
        if (data.events?.length) setEvents(data.events.slice(0, 8))
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [matchId, status])

  const typeIcon: Record<string, string> = {
    GOAL: '⚽', YELLOW_CARD: '🟡', RED_CARD: '🔴', SUBSTITUTION: '🔄',
  }

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        {status === 'IN_PLAY' && (
          <span className="animate-pulse font-bold text-white px-2 py-0.5 rounded-full text-xs"
            style={{ background: '#b91c1c' }}>● LIVE</span>
        )}
        {status === 'FINISHED' && (
          <span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e3a5f', color: '#7bb8f5' }}>全场结束</span>
        )}
        {status === 'SCHEDULED' && (
          <span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e3a5f', color: '#6b7f96' }}>待开赛</span>
        )}
        {minute && <span className="text-xs" style={{ color: '#4ade80' }}>{minute}'</span>}
      </div>

      <div className="text-5xl font-black my-3" style={{ color: status === 'IN_PLAY' ? '#4ade80' : 'white' }}>
        {score.home ?? '-'} - {score.away ?? '-'}
      </div>

      {lastUpdated && (
        <div style={{ fontSize: 9, color: '#3d5470' }}>
          更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 space-y-1.5 text-left">
          {events.map((e, i) => (
            <div key={i} style={{ background: i === 0 ? 'rgba(0,68,30,0.2)' : '#070f1a', fontSize: 11 }}
              className="flex gap-2 items-center p-2 rounded-lg">
              <span style={{ color: '#4ade80', width: 32, fontSize: 10 }} className="font-bold">{e.minute}'</span>
              <span>{typeIcon[e.type] ?? '•'}</span>
              <span style={{ color: '#cdd9e5' }}>{e.player}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
