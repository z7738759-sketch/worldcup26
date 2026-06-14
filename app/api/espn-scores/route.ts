import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ESPN name → our Chinese name mapping
const ESPN_TO_CN: Record<string, string> = {
  'Germany': '德国', 'Curaçao': '库拉索', 'Netherlands': '荷兰', 'Japan': '日本',
  'Ivory Coast': '科特迪瓦', "Côte d'Ivoire": '科特迪瓦', 'Ecuador': '厄瓜多尔',
  'Sweden': '瑞典', 'Tunisia': '突尼斯', 'Spain': '西班牙', 'Cape Verde': '佛得角',
  'Belgium': '比利时', 'Egypt': '埃及', 'Saudi Arabia': '沙特', 'Uruguay': '乌拉圭',
  'Iran': '伊朗', 'New Zealand': '新西兰', 'France': '法国', 'Senegal': '塞内加尔',
  'England': '英格兰', 'Croatia': '克罗地亚', 'Portugal': '葡萄牙', 'Congo DR': '刚果DR',
  'DR Congo': '刚果DR', 'Argentina': '阿根廷', 'Algeria': '阿尔及利亚',
  'Mexico': '墨西哥', 'South Africa': '南非', 'South Korea': '韩国', 'Korea Republic': '韩国',
  'Czechia': '捷克', 'Czech Republic': '捷克', 'Canada': '加拿大',
  'Bosnia and Herzegovina': '波黑', 'Bosnia & Herzegovina': '波黑',
  'United States': '美国', 'USA': '美国', 'Paraguay': '巴拉圭',
  'Qatar': '卡塔尔', 'Switzerland': '瑞士', 'Brazil': '巴西', 'Morocco': '摩洛哥',
  'Scotland': '苏格兰', 'Haiti': '海地', 'Australia': '澳大利亚', 'Türkiye': '土耳其',
  'Turkey': '土耳其', 'Norway': '挪威', 'Austria': '奥地利', 'Colombia': '哥伦比亚',
  'Uzbekistan': '乌兹别克斯坦', 'Ghana': '加纳', 'Panama': '巴拿马', 'Jordan': '约旦',
  'Iraq': '伊拉克',
}

function mapName(name: string): string {
  return ESPN_TO_CN[name] ?? name
}

interface ESPNEvent {
  id: string
  name: string
  status: { type: { completed: boolean; inProgress: boolean; description: string; shortDetail: string } }
  competitions: [{
    competitors: [{
      team: { displayName: string }
      score: string
      homeAway: 'home' | 'away'
    }]
  }]
}

export async function GET() {
  try {
    // Fetch today + yesterday to cover late-night games
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const fmt = (d: Date) => d.toISOString().replace(/-/g, '').split('T')[0]

    const urls = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${fmt(yesterday)}`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${fmt(today)}`,
    ]

    const results = await Promise.allSettled(
      urls.map(url => fetch(url, { next: { revalidate: 0 } }).then(r => r.json()))
    )

    const allEvents: ESPNEvent[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        allEvents.push(...(r.value.events ?? []))
      }
    }

    const scores: Record<string, { homeScore: number; awayScore: number; status: string; minute: string; completed: boolean; inProgress: boolean }> = {}

    for (const event of allEvents) {
      const comp = event.competitions?.[0]
      if (!comp) continue
      const home = comp.competitors.find((c) => c.homeAway === 'home')
      const away = comp.competitors.find((c) => c.homeAway === 'away')
      if (!home || !away) continue

      const homeCN = mapName(home.team.displayName)
      const awayCN = mapName(away.team.displayName)
      const key = `${homeCN}|${awayCN}`

      scores[key] = {
        homeScore: parseInt(home.score ?? '0'),
        awayScore: parseInt(away.score ?? '0'),
        status: event.status.type.description,
        minute: event.status.type.shortDetail,
        completed: event.status.type.completed,
        inProgress: event.status.type.inProgress,
      }
    }

    return NextResponse.json({ scores, updatedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ scores: {}, error: String(e) })
  }
}
