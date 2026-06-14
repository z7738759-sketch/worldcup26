import { Redis } from '@upstash/redis'
import type { Analysis } from './types'

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

export async function getAnalysis(matchId: number): Promise<Analysis | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<Analysis>(`analysis:${matchId}`)
  } catch {
    return null
  }
}

export async function setAnalysis(matchId: number, analysis: Analysis): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.set(`analysis:${matchId}`, analysis, { ex: 60 * 60 * 24 * 7 })
}

export async function getLiveCache(matchId: number): Promise<unknown> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get(`live:${matchId}`)
  } catch {
    return null
  }
}

export async function setLiveCache(matchId: number, data: unknown): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.set(`live:${matchId}`, data, { ex: 60 })
}
