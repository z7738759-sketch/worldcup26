import Anthropic from '@anthropic-ai/sdk'
import type { Prediction } from './types'
import modelStateData from '@/data/model-state.json'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface EloUpdate { team: string; delta: number; reason: string }
export interface RuleUpdate { ruleId: string; action: 'boost' | 'reduce' | 'confirm' | 'none'; reason: string }

export interface BacktestResult {
  matchId: number
  date: string
  match: string
  prediction: string
  actualScore: string
  predictionCorrect: boolean
  whatWorked: string
  whatFailed: string
  rootCause: string
  lesson: string
  eloAdjustments: EloUpdate[]
  ruleUpdates: RuleUpdate[]
  newBlindspot: string | null
  confidence: 'high' | 'medium' | 'low'
}

// 标准ELO更新公式（K=40 for World Cup）
export function computeEloDelta(
  eloHome: number,
  eloAway: number,
  homeGoals: number,
  awayGoals: number,
  K = 40
): { homeDelta: number; awayDelta: number } {
  const expected = 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400))
  const actual = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0
  const homeDelta = Math.round(K * (actual - expected))
  return { homeDelta, awayDelta: -homeDelta }
}

function parseScore(score: string): { home: number; away: number } | null {
  const m = score.match(/^(\d+)-(\d+)$/)
  if (!m) return null
  return { home: parseInt(m[1]), away: parseInt(m[2]) }
}

function getTeamElo(team: string): number {
  const elo = (modelStateData.elo as Record<string, number>)[team]
  return elo ?? 1750
}

export async function runPostMatchAnalysis(p: Prediction): Promise<BacktestResult | null> {
  if (!p.actualScore) return null

  const score = parseScore(p.actualScore)
  if (!score) return null

  const eloHome = getTeamElo(p.homeTeam)
  const eloAway = getTeamElo(p.awayTeam)
  const { homeDelta, awayDelta } = computeEloDelta(eloHome, eloAway, score.home, score.away)

  const mWeights = modelStateData.mRuleWeights as Record<string, { adjustedWeight: number; note: string }>
  const mWeightSummary = Object.entries(mWeights)
    .map(([id, w]) => `${id}(权重×${w.adjustedWeight})`)
    .join(', ')

  const blindspots = modelStateData.modelBlindspots.map((b, i) => `${i + 1}. ${b}`).join('\n')
  const teamAdj = (modelStateData.teamSpecificAdjustments as Record<string, unknown>)

  const prompt = `你是世界杯AI预测模型的自我诊断引擎。你的职责是：在每场比赛结束后，客观评估之前的预测哪里对了、哪里错了、为什么，并给出具体的模型参数调整建议。

## 本场比赛

- 比赛：${p.homeTeam}（ELO ${eloHome}） vs ${p.awayTeam}（ELO ${eloAway}）
- 组别：${p.group}
- 预测A：${p.predictionA}
- 预测B：${p.predictionB}
- 触发的M规则：${p.mRulesTriggered.join(', ') || '无'}
- 预测备注：${p.notes}
- **实际结果：${p.actualScore}**
- 方向是否正确：${p.directionCorrect ? '✅ 是' : '❌ 否'}
- 比分是否完全命中：${p.exactHit ? '✅ 是' : '❌ 否'}

## 当前模型状态（供参考）
- M规则权重：${mWeightSummary}
- 已知模型盲点：
${blindspots}
- ${p.homeTeam}特殊调整：${JSON.stringify((teamAdj as Record<string, unknown>)[p.homeTeam] ?? '无')}
- ${p.awayTeam}特殊调整：${JSON.stringify((teamAdj as Record<string, unknown>)[p.awayTeam] ?? '无')}

## 标准ELO调整（已自动计算）
- ${p.homeTeam} ELO变化：${homeDelta > 0 ? '+' : ''}${homeDelta}（${eloHome} → ${eloHome + homeDelta}）
- ${p.awayTeam} ELO变化：${awayDelta > 0 ? '+' : ''}${awayDelta}（${eloAway} → ${eloAway + awayDelta}）

## 你的任务

基于以上信息，用中文输出严格的JSON格式分析（无markdown代码块，纯JSON）：

{
  "whatWorked": "这场预测中，哪个因素判断正确了？（50字内）",
  "whatFailed": "这场预测中，哪个因素判断错了？（50字内，如果预测正确则写'预测准确，无需纠正'）",
  "rootCause": "根本原因分析：为什么模型会这样判断？是数据缺失、规则盲区、还是系统性偏差？（80字内）",
  "lesson": "这场比赛给模型的最重要教训，一句话，未来预测中必须记住的（40字内）",
  "eloAdjustments": [
    {
      "team": "队伍名",
      "delta": 数字（已由标准公式计算，你可以在此基础上+/-5分做战术修正）,
      "reason": "调整原因（20字内）"
    }
  ],
  "ruleUpdates": [
    {
      "ruleId": "M1/M2/M3/M4/M5/M6/ASIA",
      "action": "boost（增强权重）/ reduce（降低权重）/ confirm（验证有效）/ none（无影响）",
      "reason": "原因（30字内）"
    }
  ],
  "newBlindspot": "如果发现了新的系统性盲点，写在这里（60字内）；如果没有新发现，写null",
  "confidence": "high/medium/low（这场反推分析你有多大把握？）"
}`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text
    const parsed = JSON.parse(text)

    return {
      matchId: p.matchId,
      date: new Date().toISOString().split('T')[0],
      match: `${p.homeTeam} vs ${p.awayTeam} ${p.actualScore}`,
      prediction: `${p.predictionA} / ${p.predictionB}`,
      actualScore: p.actualScore,
      predictionCorrect: !!p.exactHit || !!p.directionCorrect,
      ...parsed,
      eloAdjustments: [
        { team: p.homeTeam, delta: homeDelta, reason: `ELO标准公式` },
        { team: p.awayTeam, delta: awayDelta, reason: `ELO标准公式` },
        ...(parsed.eloAdjustments ?? []).filter((a: EloUpdate) =>
          a.team !== p.homeTeam && a.team !== p.awayTeam
        ),
      ],
    }
  } catch (e) {
    console.error('backtest error', e)
    return null
  }
}

// 批量反推：找出所有已完成但没有backtest记录的比赛
export function findUnanalyzedMatches(
  predictions: Prediction[],
  existingLogs: Set<number>
): Prediction[] {
  return predictions.filter(
    p => p.actualScore !== null && !existingLogs.has(p.matchId)
  )
}
