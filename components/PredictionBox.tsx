import type { Analysis } from '@/lib/types'

export default function PredictionBox({ analysis }: { analysis: Analysis }) {
  return (
    <div style={{ background: 'rgba(0,68,30,0.25)', border: '1px solid #16a34a' }} className="rounded-xl p-5 flex gap-4">
      <div className="text-3xl flex-shrink-0">🎯</div>
      <div className="flex-1">
        <div style={{ color: '#4ade80', fontSize: 10 }} className="font-bold tracking-widest mb-2">
          AI最终预测 · ELO+五行+贝叶斯综合
        </div>
        <div className="text-lg font-black mb-1 text-white">
          预测A：<span style={{ color: '#f5a623' }}>{analysis.predictionA}</span>
          &nbsp;|&nbsp;
          预测B：<span style={{ color: '#7bb8f5' }}>{analysis.predictionB}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6b7f96' }} className="mb-3">
          置信度：{analysis.confidence}
          {analysis.modelScore && (
            <span className="ml-3">
              | 模型：主胜{analysis.modelScore.homeWinPct}% / 平{analysis.modelScore.drawPct}% / 客胜{analysis.modelScore.awayWinPct}%
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.6 }}>{analysis.aiInsight}</div>
      </div>
    </div>
  )
}
