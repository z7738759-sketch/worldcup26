import { NextRequest } from 'next/server'
import { getAnalysis } from '@/lib/kv'
import { getAllPredictions } from '@/lib/predictions'
import { computeModelOutput } from '@/lib/model'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const matchId = Number(req.nextUrl.searchParams.get('id'))
  if (!matchId) return Response.json({ error: 'Missing id' }, { status: 400 })

  const cached = await getAnalysis(matchId)
  if (cached) return Response.json({ analysis: cached, source: 'ai' })

  const predictions = getAllPredictions()
  const p = predictions.find(pred => pred.matchId === matchId)
  if (!p) return Response.json({ analysis: null })

  const modelScore = computeModelOutput(p.homeTeam, p.awayTeam, p.kickoff, { predictionA: p.predictionA, predictionB: p.predictionB })
  return Response.json({
    analysis: {
      matchId: p.matchId,
      predictionA: p.predictionA,
      predictionB: p.predictionB,
      notes: p.notes,
      mRulesTriggered: p.mRulesTriggered,
      modelScore,
    },
    source: 'static',
  })
}
