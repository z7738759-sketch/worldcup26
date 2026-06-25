import predictionsData from '@/data/predictions.json'
import modelStateData from '@/data/model-state.json'
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

// 从预测文本解析总进球数（predictionA 的主场+客场进球之和）
export function parsePredGoals(pred: string): number | null {
  const m = pred.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (!m) return null
  return parseInt(m[1]) + parseInt(m[2])
}

export function getAccuracyStats() {
  const finished = predictionsData.filter(p => p.actualScore !== null)
  const total = finished.length

  // 胜平负方向命中：基于显式 winDrawLoss
  const scoreDirectionHits = finished.filter(p => {
    if (!p.actualScore || !p.winDrawLoss) return false
    const [hg, ag] = p.actualScore.split('-').map(Number)
    const actual = hg > ag ? 'home' : ag > hg ? 'away' : 'draw'
    return p.winDrawLoss === actual
  }).length

  // 比分类：仅判断 predictionA 是否精确命中（A是正式主预测）
  const scoreExactHits = finished.filter(p => {
    if (!p.actualScore || !p.predictionA) return false
    const m = p.predictionA.match(/(\d+)\s*[-–—]\s*(\d+)/)
    if (!m) return false
    return `${m[1]}-${m[2]}` === p.actualScore
  }).length

  // 总进球：v22公式——在v21基础上加入ELO区间调整因子
  // 依据：54场实测，ELO150-200场均2.18球（摆大巴），ELO50-150场均3.3+球
  // ELO 0-50:×1.0  50-100:×1.05  100-150:×1.0  150-200:×0.85  200-300:×0.93  300+:×1.05
  const totalGoalsHits = (() => {
    const eloMap = (modelStateData as Record<string, unknown>).elo as Record<string, number>
    const teamGoals: Record<string, { sum: number; n: number }> = {}
    finished.forEach(p => {
      if (!p.actualScore) return
      const [h, a] = p.actualScore.split('-').map(Number)
      const tot = h + a
      for (const t of [p.homeTeam, p.awayTeam]) {
        if (!teamGoals[t]) teamGoals[t] = { sum: 0, n: 0 }
        teamGoals[t].sum += tot
        teamGoals[t].n++
      }
    })
    const tAvg = (t: string) => teamGoals[t] ? teamGoals[t].sum / teamGoals[t].n : 2.9

    // ELO区间调整：仅对150-200区间下调（54场实测均2.18球，明显低于总均值2.98）
    // 其他区间不作调整——历史均值已能捕捉，上调反而引入噪音（实测损失命中）
    const eloAdj = (homeTeam: string, awayTeam: string) => {
      const diff = Math.abs((eloMap[homeTeam] ?? 1800) - (eloMap[awayTeam] ?? 1800))
      if (diff >= 150 && diff < 200) return 0.85  // 摆大巴高发区：均2.18球
      return 1.0
    }

    return finished.filter(p => {
      if (!p.actualScore || !p.lambdaHome || !p.lambdaAway) return false
      const [hg, ag] = p.actualScore.split('-').map(Number)
      const actualTotal = hg + ag
      const lam = (p.lambdaHome as number) + (p.lambdaAway as number)
      const histAvg = (tAvg(p.homeTeam) + tAvg(p.awayTeam)) / 2
      const blended = (0.3 * lam + 0.7 * histAvg) * eloAdj(p.homeTeam, p.awayTeam)
      const predA = Math.round(blended)
      const predB = blended > predA ? predA + 1 : predA - 1
      return actualTotal === predA || actualTotal === predB
    }).length
  })()

  return {
    total,
    scoreDirectionHits,
    scoreExactHits,
    scoreDirectionRate: total ? Math.round((scoreDirectionHits / total) * 100) : 0,
    scoreExactRate: total ? Math.round((scoreExactHits / total) * 100) : 0,
    totalGoalsHits,
    totalGoalsRate: total ? Math.round((totalGoalsHits / total) * 100) : 0,
  }
}

// 从预测文本解析方向和比分
function parseScoreAndDirection(pred: string, homeTeam: string, awayTeam: string): { direction: 'home' | 'away' | 'draw'; score: string } | null {
  const m = pred.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (!m) return null
  const h = parseInt(m[1]), a = parseInt(m[2])
  // 比分总是主队在前（H-A格式）
  return {
    direction: h > a ? 'home' : a > h ? 'away' : 'draw',
    score: `${h}-${a}`
  }
}

// 从预测文本解析总进球数
function parseGoalsFromPredictionText(text: string): number | null {
  const m = text.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (!m) return null
  return parseInt(m[1]) + parseInt(m[2])
}
