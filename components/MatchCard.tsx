import Link from 'next/link'
import Image from 'next/image'
import type { Prediction } from '@/lib/types'
import { getFlagUrl } from '@/lib/match-utils'

function FlagImg({ team, size = 32 }: { team: string; size?: number }) {
  const url = getFlagUrl(team, '32x24')
  if (!url) return <div style={{ width: size, height: Math.round(size * 0.75), background: '#1e3a5f', borderRadius: 3 }} />
  return (
    <Image
      src={url}
      alt={team}
      width={size}
      height={Math.round(size * 0.75)}
      style={{ borderRadius: 3, objectFit: 'cover' }}
      unoptimized
    />
  )
}

export default function MatchCard({ p, totalGoalsA, totalGoalsB }: { p: Prediction; totalGoalsA?: number; totalGoalsB?: number }) {
  const hasResult = p.actualScore !== null

  return (
    <Link href={`/match/${p.matchId}`}
      style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }}
      className="rounded-xl p-4 block hover:border-yellow-500 transition-colors group relative overflow-hidden">
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.3), transparent)' }}
        className="absolute top-0 left-0 right-0 group-hover:opacity-100 opacity-0 transition-opacity" />

      <div style={{ fontSize: 10, color: '#6b7f96' }} className="font-bold tracking-wide mb-3">
        {p.group} · {hasResult ? '已结束' : '即将开赛'}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1 flex flex-col items-center gap-1.5">
          <FlagImg team={p.homeTeam} size={40} />
          <div className="text-xs font-semibold text-white">{p.homeTeam}</div>
        </div>
        <div className="text-center px-3">
          {hasResult
            ? <div className="text-xl font-black text-white">{p.actualScore}</div>
            : <div style={{ fontSize: 10, color: '#3d5470' }} className="font-bold">VS</div>
          }
        </div>
        <div className="text-center flex-1 flex flex-col items-center gap-1.5">
          <FlagImg team={p.awayTeam} size={40} />
          <div className="text-xs font-semibold text-white">{p.awayTeam}</div>
        </div>
      </div>

      <div style={{ background: '#070f1a', fontSize: 11, color: '#8899aa' }} className="rounded-lg p-2 mb-2">
        {p.updatedPrediction ? (
          <div>
            <div style={{ color: '#f87171', textDecoration: 'line-through', fontSize: 10 }}>原预测A：{p.updatedPrediction.originalA}</div>
            <div>更新A：<span style={{ color: '#4ade80' }} className="font-bold">{p.predictionA}</span> / {p.predictionB}</div>
            <div style={{ color: '#f5a623', fontSize: 9, marginTop: 2 }}>⚡ 已更新：{p.updatedPrediction.reason}</div>
          </div>
        ) : (
          <div>预测：<span style={{ color: '#f5a623' }} className="font-bold">{p.predictionA}</span> / {p.predictionB}</div>
        )}
        {totalGoalsA !== undefined && (
          <div style={{ color: '#6b7f96', marginTop: 2 }}>
            总进球：<span style={{ color: '#cdd9e5' }}>{totalGoalsA}球</span>
            {totalGoalsB !== undefined && totalGoalsB !== totalGoalsA && (
              <span style={{ color: '#3d5470' }}> / {totalGoalsB}球</span>
            )}
          </div>
        )}
      </div>

      {hasResult && (
        <div style={{
          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, display: 'inline-block',
          background: p.exactHit ? '#14532d' : p.directionCorrect ? 'rgba(120,80,0,0.4)' : '#7f1d1d',
          color: p.exactHit ? '#4ade80' : p.directionCorrect ? '#facc15' : '#f87171',
        }}>
          {p.exactHit ? '✓ 完全命中' : p.directionCorrect ? '方向正确' : '✗ 未中'}
        </div>
      )}
    </Link>
  )
}
