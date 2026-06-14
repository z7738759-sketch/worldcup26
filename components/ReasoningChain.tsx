import type { ReasoningStep } from '@/lib/types'

export default function ReasoningChain({ steps }: { steps: ReasoningStep[] }) {
  return (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-5">
      <h3 style={{ color: '#6b7f96', fontSize: 10 }} className="font-bold tracking-widest uppercase mb-4">
        🔗 完整推理链 · AI分析过程透明化
      </h3>
      <div>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 py-4" style={{ borderBottom: i < steps.length - 1 ? '1px solid #0a1628' : 'none' }}>
            <div style={{ background: '#1a2d45', color: '#f5a623', fontSize: 11, flexShrink: 0 }}
              className="w-6 h-6 rounded-full flex items-center justify-center font-black mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1">
              <div style={{ color: '#cdd9e5' }} className="text-sm font-bold mb-1">{step.title}</div>
              <div style={{ color: '#8899aa', fontSize: 12, lineHeight: 1.6 }} className="mb-2">{step.detail}</div>
              <div style={{ color: '#f5a623', fontSize: 11 }} className="font-semibold">{step.conclusion}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
