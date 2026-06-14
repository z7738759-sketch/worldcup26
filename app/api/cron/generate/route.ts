import { NextRequest } from 'next/server'
import { getTodayMatches } from '@/lib/football-api'
import { generateMatchAnalysis } from '@/lib/claude-api'
import { getAnalysis, setAnalysis } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const matches = await getTodayMatches()
  const generated: number[] = []

  for (const match of matches) {
    const kickoffMs = new Date(match.utcDate).getTime()
    const hoursUntil = (kickoffMs - Date.now()) / 3600000
    if (hoursUntil > 3 || hoursUntil < -2) continue

    const existing = await getAnalysis(match.id)
    if (existing) continue

    try {
      const analysis = await generateMatchAnalysis({
        matchId: match.id,
        homeTeam: match.homeTeam?.name ?? 'HomeTeam',
        awayTeam: match.awayTeam?.name ?? 'AwayTeam',
        group: match.group ?? '',
        kickoff: match.utcDate,
        odds: [
          { bookmaker: 'bet365', isSharpFriendly: true, homeWin: '-120', draw: '+260', awayWin: '+300' },
        ],
        extraContext: `世界杯小组赛${match.group ?? ''}。基于球队实力评级和近期状态分析。`,
      })
      await setAnalysis(match.id, analysis)
      generated.push(match.id)
    } catch (e) {
      console.error(`Failed to generate for match ${match.id}:`, e)
    }
  }

  return Response.json({ generated, total: generated.length })
}
