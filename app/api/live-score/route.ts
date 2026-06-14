import { NextRequest } from 'next/server'
import { getMatchById } from '@/lib/football-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('id')
  if (!matchId) return Response.json({ error: 'Missing id' }, { status: 400 })
  try {
    const match = await getMatchById(Number(matchId))
    const events = match.goals ?? []
    return Response.json({ match, events })
  } catch {
    return Response.json({ error: 'Failed', match: null, events: [] })
  }
}
