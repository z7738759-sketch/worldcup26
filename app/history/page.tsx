import { getAllPredictions } from '@/lib/predictions'
import MatchCard from '@/components/MatchCard'

export default function HistoryPage() {
  const predictions = getAllPredictions()
  const sorted = [...predictions].sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-1 text-white">历史预测档案</h1>
      <p style={{ color: '#6b7f96' }} className="text-sm mb-8">所有已分析场次 · 按时间倒序 · 点击查看完整推理链</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map(p => <MatchCard key={p.matchId} p={p} />)}
      </div>
    </div>
  )
}
