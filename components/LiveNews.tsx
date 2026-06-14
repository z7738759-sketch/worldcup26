import liveNews from '@/data/live-news.json'

interface NewsItem {
  id: number
  team: string
  timestamp: string
  source: string
  title: string
  content: string
  impactLevel: 'high' | 'medium' | 'low'
  impactNote: string
  relatedMatches: number[]
}

const newsData = liveNews as NewsItem[]

const IMPACT_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f5a623',
  low: '#60a5fa',
}

const IMPACT_LABELS: Record<string, string> = {
  high: '重大影响',
  medium: '中等影响',
  low: '轻微影响',
}

export default function LiveNews({ teamFilter, matchId }: { teamFilter?: string; matchId?: number }) {
  let items = newsData

  if (teamFilter) {
    items = items.filter(n => n.team === teamFilter)
  } else if (matchId) {
    items = items.filter(n => n.relatedMatches.includes(matchId))
  }

  // 按时间倒序
  items = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (items.length === 0) return null

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d1b2a, #0f1d30)', border: '1px solid #1e3a5f', borderRadius: 16, padding: 'clamp(14px, 2vw, 20px)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>📡</span>
        <h3 style={{ fontSize: 14, color: '#f5a623', fontWeight: 700, letterSpacing: '1px', margin: 0 }}>
          实时消息追踪
        </h3>
        <span style={{ fontSize: 10, color: '#6b7f96', background: '#1a2d45', padding: '2px 8px', borderRadius: 9999 }}>
          {items.length} 条已验证
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#070f1a',
            border: `1px solid ${IMPACT_COLORS[item.impactLevel]}20`,
            borderLeft: `3px solid ${IMPACT_COLORS[item.impactLevel]}`,
            borderRadius: 12,
            padding: 14,
          }}>
            {/* 标题行 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#cdd9e5', fontWeight: 700 }}>{item.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9999,
                  background: `${IMPACT_COLORS[item.impactLevel]}20`,
                  color: IMPACT_COLORS[item.impactLevel],
                }}>
                  {IMPACT_LABELS[item.impactLevel]}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#6b7f96', flexShrink: 0 }}>
                🕐 {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })} 北京时间
              </span>
            </div>

            {/* 内容 */}
            <div style={{ fontSize: 13, color: '#8899aa', lineHeight: 1.7, marginBottom: 10 }}>
              {item.content}
            </div>

            {/* 来源 */}
            <div style={{ fontSize: 10, color: '#3d5470', marginBottom: 8 }}>
              📋 来源：{item.source}
            </div>

            {/* 影响评估 */}
            <div style={{
              background: '#0a1525',
              border: '1px solid #1a2d45',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: '#f59e0b',
              lineHeight: 1.6,
            }}>
              <span style={{ fontWeight: 700, color: IMPACT_COLORS[item.impactLevel] }}>⚠️ 影响评估：</span>
              <span style={{ color: '#cdd9e5' }}>{item.impactNote}</span>
              <div style={{ fontSize: 10, color: '#6b7f96', marginTop: 4 }}>
                ℹ️ 预测结果未修改 · 以下为基于当前信息的额外判断
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
