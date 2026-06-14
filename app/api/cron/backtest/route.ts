import { NextRequest } from 'next/server'
import { getAllPredictions } from '@/lib/predictions'
import { runPostMatchAnalysis, findUnanalyzedMatches } from '@/lib/backtest'
import { getBaseModelState, applyBacktestToState, persistModelState } from '@/lib/model-state'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // 安全验证：需要 CRON_SECRET 或 ANTHROPIC_API_KEY
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET ?? process.env.ANTHROPIC_API_KEY?.slice(-8)
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const predictions = getAllPredictions()

  // 找出所有已完成但未反推的比赛
  // 实际项目中应从 Redis 读取已处理列表，这里用 calibrationHistory 里的 matchId
  const state = getBaseModelState()
  const analyzedIds = new Set(state.calibrationHistory.map(h => h.matchId))
  const toAnalyze = findUnanalyzedMatches(predictions, analyzedIds)

  if (toAnalyze.length === 0) {
    return Response.json({ message: '无待分析比赛', analyzed: 0 })
  }

  const results = []
  let currentState = state

  for (const match of toAnalyze) {
    const result = await runPostMatchAnalysis(match)
    if (!result) continue

    currentState = applyBacktestToState(currentState, result)
    results.push(result)

    // 避免 API 限流
    await new Promise(r => setTimeout(r, 1000))
  }

  // 持久化更新后的模型状态
  await persistModelState(currentState)

  return Response.json({
    message: `已完成 ${results.length} 场反推分析`,
    analyzed: results.length,
    newModelVersion: currentState.version,
    directionAccuracy: `${(currentState.globalStats.directionAccuracy * 100).toFixed(1)}%`,
    results: results.map(r => ({
      match: r.match,
      lesson: r.lesson,
      eloChanges: r.eloAdjustments.map(u => `${u.team}${u.delta > 0 ? '+' : ''}${u.delta}`).join(', '),
    })),
  })
}

// GET 端点：查看模型状态 / cron 触发自动反推
export async function GET(req: NextRequest) {
  const isCron = req.nextUrl.searchParams.get('cron') === '1'

  // cron 模式：自动运行反推分析
  if (isCron) {
    const auth = req.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    // Vercel cron 自带验证，无 authorization header 也允许
    if (secret && auth && auth !== `Bearer ${secret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const predictions = getAllPredictions()
    const state = getBaseModelState()
    const analyzedIds = new Set(state.calibrationHistory.map(h => h.matchId))
    const toAnalyze = findUnanalyzedMatches(predictions, analyzedIds)

    if (toAnalyze.length === 0) {
      return Response.json({ message: '无待分析比赛', analyzed: 0, modelVersion: state.version })
    }

    let currentState = state
    const results = []

    for (const match of toAnalyze) {
      // 只反推已完成超过1小时的比赛（确保比分稳定）
      const matchEnd = new Date(match.kickoff).getTime() + 2.5 * 3600000
      if (Date.now() - matchEnd < 3600000) continue

      const result = await runPostMatchAnalysis(match)
      if (!result) continue

      currentState = applyBacktestToState(currentState, result)
      results.push({ match: result.match, lesson: result.lesson })
      await new Promise(r => setTimeout(r, 1000))
    }

    if (results.length > 0) {
      await persistModelState(currentState)
    }

    return Response.json({
      message: `反推完成：${results.length} 场`,
      analyzed: results.length,
      modelVersion: currentState.version,
      directionAccuracy: `${(currentState.globalStats.directionAccuracy * 100).toFixed(1)}%`,
      lessons: results,
    })
  }

  // 普通模式：查看状态
  const state = getBaseModelState()
  return Response.json({
    version: state.version,
    matchesAnalyzed: state.matchesAnalyzed,
    lastUpdated: state.lastUpdated,
    globalStats: state.globalStats,
    mRuleWeights: state.mRuleWeights,
    recentLessons: state.calibrationHistory.slice(-3).map(h => h.lesson),
    modelBlindspots: state.modelBlindspots,
  })
}
