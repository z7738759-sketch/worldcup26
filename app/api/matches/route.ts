import { getTodayMatches } from '@/lib/football-api'
import { getAllPredictions } from '@/lib/predictions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiMatches = await getTodayMatches()
  if (apiMatches.length > 0) return Response.json({ matches: apiMatches, source: 'api' })

  // 无 API Key 时，从 predictions.json 生成今日赛程
  const today = new Date().toISOString().split('T')[0]
  const predictions = getAllPredictions()
  const todayPredictions = predictions.filter(p => p.kickoff.startsWith(today))

  const matches = todayPredictions.map(p => {
    const now = Date.now()
    const kickoff = new Date(p.kickoff).getTime()
    const elapsed = now - kickoff
    let status = 'SCHEDULED'
    if (p.actualScore !== null) status = 'FINISHED'
    else if (elapsed > 0 && elapsed < 2 * 60 * 60 * 1000) status = 'IN_PLAY'

    const [homeScore, awayScore] = p.actualScore
      ? p.actualScore.split('-').map(Number)
      : [null, null]

    return {
      id: p.matchId,
      homeTeam: { name: p.homeTeam },
      awayTeam: { name: p.awayTeam },
      group: p.group,
      status,
      score: { fullTime: { home: homeScore, away: awayScore } },
      predictionA: p.predictionA,
      predictionB: p.predictionB,
      mRules: p.mRulesTriggered,
    }
  })

  return Response.json({ matches, source: 'predictions' })
}
