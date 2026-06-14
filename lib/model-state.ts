import type { BacktestResult, EloUpdate, RuleUpdate } from './backtest'

// 在 Vercel 上 data/ 目录只能在构建时读写
// 运行时更新通过 KV (Redis) 存储，降级时返回静态基准
import baseState from '@/data/model-state.json'
import { setAnalysis } from './kv'

export interface ModelState {
  version: number
  lastUpdated: string
  matchesAnalyzed: number
  elo: Record<string, number>
  mRuleWeights: Record<string, { adjustedWeight: number; note: string }>
  wuxingStats: { accuracy: number; currentWeight: number }
  globalStats: {
    directionAccuracy: number
    exactHitRate: number
    totalCompleted: number
  }
  calibrationHistory: CalibrationEntry[]
  modelBlindspots: string[]
  teamSpecificAdjustments: Record<string, Record<string, unknown>>
}

export interface CalibrationEntry {
  matchId: number
  date: string
  match: string
  prediction: string
  lesson: string
  eloAdjustments: Record<string, number>
  ruleUpdates: string
}

export function getBaseModelState(): ModelState {
  return baseState as unknown as ModelState
}

export function applyBacktestToState(state: ModelState, result: BacktestResult): ModelState {
  const next = JSON.parse(JSON.stringify(state)) as ModelState

  // 1. ELO 更新
  for (const upd of result.eloAdjustments as EloUpdate[]) {
    if (next.elo[upd.team] !== undefined) {
      next.elo[upd.team] = Math.round(next.elo[upd.team] + upd.delta)
    }
  }

  // 2. M 规则权重调整
  for (const upd of result.ruleUpdates as RuleUpdate[]) {
    if (!next.mRuleWeights[upd.ruleId]) continue
    const current = next.mRuleWeights[upd.ruleId].adjustedWeight
    if (upd.action === 'boost') {
      next.mRuleWeights[upd.ruleId].adjustedWeight = Math.min(2.0, +(current + 0.05).toFixed(2))
      next.mRuleWeights[upd.ruleId].note = upd.reason
    } else if (upd.action === 'reduce') {
      next.mRuleWeights[upd.ruleId].adjustedWeight = Math.max(0.3, +(current - 0.05).toFixed(2))
      next.mRuleWeights[upd.ruleId].note = upd.reason
    } else if (upd.action === 'confirm') {
      next.mRuleWeights[upd.ruleId].note = `已验证有效：${upd.reason}`
    }
  }

  // 3. 全局统计更新
  const total = next.globalStats.totalCompleted + 1
  const prevDir = next.globalStats.directionAccuracy * next.globalStats.totalCompleted
  const prevExact = next.globalStats.exactHitRate * next.globalStats.totalCompleted
  next.globalStats.totalCompleted = total
  next.globalStats.directionAccuracy = +((prevDir + (result.predictionCorrect ? 1 : 0)) / total).toFixed(3)
  next.globalStats.exactHitRate = +((prevExact + 0) / total).toFixed(3)

  // 4. 新盲点
  if (result.newBlindspot) {
    const exists = next.modelBlindspots.some(b => b === result.newBlindspot)
    if (!exists) next.modelBlindspots.push(result.newBlindspot!)
  }

  // 5. 校正历史
  const eloMap: Record<string, number> = {}
  for (const u of result.eloAdjustments as EloUpdate[]) eloMap[u.team] = u.delta

  next.calibrationHistory.push({
    matchId: result.matchId,
    date: result.date,
    match: result.match,
    prediction: result.prediction,
    lesson: result.lesson,
    eloAdjustments: eloMap,
    ruleUpdates: (result.ruleUpdates as RuleUpdate[])
      .filter(r => r.action !== 'none')
      .map(r => `${r.ruleId}:${r.action}`)
      .join(', ') || '无',
  })

  next.matchesAnalyzed = total
  next.lastUpdated = result.date
  next.version = (next.version ?? 1) + 1

  return next
}

// 把更新后的模型状态写入 Redis（运行时持久化）
export async function persistModelState(state: ModelState): Promise<void> {
  // 存在 KV 中，key = 'model-state'
  // 使用 Analysis 存储接口复用（临时方案）
  try {
    const { setAnalysis: kv } = await import('./kv')
    // 用 matchId = 0 作为 model-state 的特殊key
    await kv(0, state as unknown as import('./types').Analysis)
  } catch {
    // Redis 未配置时静默失败
  }
}

// 构建用于注入预测的当前模型上下文
export function buildModelContext(state: ModelState, homeTeam: string, awayTeam: string): string {
  const eloH = state.elo[homeTeam] ?? 1750
  const eloA = state.elo[awayTeam] ?? 1750
  const adjH = state.teamSpecificAdjustments?.[homeTeam]
  const adjA = state.teamSpecificAdjustments?.[awayTeam]

  const topLessons = state.calibrationHistory
    .slice(-5)
    .map(h => `• ${h.lesson}`)
    .join('\n')

  const blindspots = state.modelBlindspots
    .map((b, i) => `${i + 1}. ${b}`)
    .join('\n')

  const mWeights = Object.entries(state.mRuleWeights)
    .map(([id, w]) => `${id}×${w.adjustedWeight}`)
    .join(' | ')

  return `
【模型当前状态 v${state.version}，${state.matchesAnalyzed}场已分析】
方向准确率: ${(state.globalStats.directionAccuracy * 100).toFixed(1)}% | 精确命中: ${(state.globalStats.exactHitRate * 100).toFixed(1)}%

ELO（已反推校正）:
- ${homeTeam}: ${eloH}${adjH ? `（附加调整: ${JSON.stringify(adjH)}）` : ''}
- ${awayTeam}: ${eloA}${adjA ? `（附加调整: ${JSON.stringify(adjA)}）` : ''}

M规则权重: ${mWeights}

最近5场教训:
${topLessons}

已知系统性盲点（请主动回避）:
${blindspots}
`.trim()
}
