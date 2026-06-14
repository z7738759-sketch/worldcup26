import predictionsData from '@/data/predictions.json'
import type { Prediction } from './types'

export function getAllPredictions(): Prediction[] {
  return predictionsData as Prediction[]
}

export function getStandingsFromPredictions() {
  const all = predictionsData as Prediction[]

  // 先收集全部队伍（含尚未出赛的）
  const groups: Record<string, Record<string, {
    team: string; played: number; won: number; drawn: number
    lost: number; gf: number; ga: number; pts: number
  }>> = {}

  const ensureTeam = (g: string, team: string) => {
    if (!groups[g]) groups[g] = {}
    if (!groups[g][team]) groups[g][team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
  }

  // 先登记所有预测中出现的队（无论是否有结果）
  for (const match of all) {
    ensureTeam(match.group, match.homeTeam)
    ensureTeam(match.group, match.awayTeam)
  }

  // 再处理已完成比赛的积分
  for (const match of all.filter(p => p.actualScore !== null)) {
    const [hg, ag] = (match.actualScore as string).split('-').map(Number)
    const g = match.group
    for (const [team, isHome] of [[match.homeTeam, true], [match.awayTeam, false]] as [string, boolean][]) {
      const r = groups[g][team]
      r.played++
      r.gf += isHome ? hg : ag
      r.ga += isHome ? ag : hg
      const scored = isHome ? hg : ag
      const conceded = isHome ? ag : hg
      if (scored > conceded) { r.won++; r.pts += 3 }
      else if (scored < conceded) r.lost++
      else { r.drawn++; r.pts++ }
    }
  }

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => ({
    group,
    table: Object.values(teams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga)
      return b.gf - a.gf
    }).map((t, i) => ({ ...t, position: i + 1, gd: t.gf - t.ga }))
  }))
}

export function getAccuracyStats() {
  const finished = predictionsData.filter(p => p.actualScore !== null)
  const total = finished.length

  // 比分类：方向+精确
  const scoreDirectionHits = finished.filter(p => p.directionCorrect).length
  const scoreExactHits = finished.filter(p => p.exactHit).length

  // 总进球类：独立核算
  // 从实际比分计算总进球数，判断是否在模型预测范围内
  const totalGoalsHits = finished.filter(p => {
    const tg = (p as unknown as Record<string, unknown>).totalGoalsDirectionCorrect
    if (tg === true || tg === false) return tg
    // 如果没设置，从实际比分反算
    if (!p.actualScore) return false
    const [hg, ag] = p.actualScore.split('-').map(Number)
    const actualTotal = hg + ag
    // 需要模型输出来获取预测范围——这里用近似：predictionA/B中解析
    const goalsA = parseGoalsFromPredictionText(p.predictionA)
    const goalsB = parseGoalsFromPredictionText(p.predictionB)
    if (goalsA === null || goalsB === null) return false
    const lo = Math.min(goalsA, goalsB)
    const hi = Math.max(goalsA, goalsB)
    return actualTotal >= lo && actualTotal <= hi
  }).length

  return {
    total,
    // 比分模块
    scoreDirectionHits,
    scoreExactHits,
    scoreDirectionRate: total ? Math.round((scoreDirectionHits / total) * 100) : 0,
    scoreExactRate: total ? Math.round((scoreExactHits / total) * 100) : 0,
    // 总进球模块
    totalGoalsHits,
    totalGoalsRate: total ? Math.round((totalGoalsHits / total) * 100) : 0,
  }
}

// 从预测文本解析总进球数
function parseGoalsFromPredictionText(text: string): number | null {
  const m = text.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (!m) return null
  return parseInt(m[1]) + parseInt(m[2])
}
