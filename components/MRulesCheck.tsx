import type { MRule } from '@/lib/types'

const LABELS: Record<string, string> = {
  M1: 'M1 反向线路移动（RLM）',
  M2: 'M2 亚盘≤-0.75防守体系',
  M3: 'M3 三方赔率差距<10%',
  M4: 'M4 首轮大球倾向',
  M5: 'M5 不同庄家差距>30%',
  M6: 'M6 庄家差距>30%+首次参赛',
  ASIA: '亚洲球队逆境力 +10%',
}

export default function MRulesCheck({ rules }: { rules: MRule[] }) {
  return (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-5">
      <h3 style={{ color: '#6b7f96', fontSize: 10 }} className="font-bold tracking-widest uppercase mb-4">🧠 M规则触发检查</h3>
      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.id}
            style={{
              background: r.triggered ? 'rgba(0,68,30,0.3)' : '#070f1a',
              borderLeft: `2px solid ${r.triggered ? '#2ecc71' : '#1e3a5f'}`,
              opacity: r.triggered ? 1 : 0.5,
            }}
            className="rounded-lg p-3">
            <div style={{ fontSize: 10, color: r.triggered ? '#2ecc71' : '#3d5470' }} className="font-bold tracking-wide mb-1">
              {r.triggered ? '✓' : '○'} {LABELS[r.id] ?? r.id}
            </div>
            <div style={{ fontSize: 11, color: '#8899aa', lineHeight: 1.5 }}>{r.reason}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
