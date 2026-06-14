const BASE = 'https://api.football-data.org/v4'
const KEY = process.env.FOOTBALL_DATA_API_KEY ?? ''
const WC_ID = 2000

// api-football.com (RapidAPI) — 提供球员伤病/状态/历史战绩
const RAPID_BASE = 'https://api-football-v1.p.rapidapi.com/v3'
const RAPID_KEY = process.env.RAPIDAPI_KEY ?? ''

async function fd(path: string, revalidate = 30) {
  if (!KEY) throw new Error('FOOTBALL_DATA_API_KEY not set')
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': KEY },
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`football-data ${res.status}: ${path}`)
  return res.json()
}

async function rapid(path: string, params: Record<string, string> = {}) {
  if (!RAPID_KEY) return null
  const url = new URL(`${RAPID_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      'x-rapidapi-key': RAPID_KEY,
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

// ——— football-data.org 接口 ———

export async function getTodayMatches() {
  const today = new Date().toISOString().split('T')[0]
  try {
    const data = await fd(`/competitions/${WC_ID}/matches?dateFrom=${today}&dateTo=${today}`, 60)
    return data.matches ?? []
  } catch {
    return []
  }
}

export async function getMatchById(id: number) {
  return fd(`/matches/${id}`, 0)
}

export async function getStandings() {
  try {
    const data = await fd(`/competitions/${WC_ID}/standings`, 300)
    return data.standings ?? []
  } catch {
    return []
  }
}

export async function getLiveMatches() {
  try {
    const data = await fd(`/competitions/${WC_ID}/matches?status=IN_PLAY`, 0)
    return data.matches ?? []
  } catch {
    return []
  }
}

// 获取比赛当前状态（轻量，只返回 status + score）
export async function getMatchStatus(apiMatchId: number): Promise<{
  status: string
  homeScore: number
  awayScore: number
  minute: number | null
} | null> {
  try {
    const data = await fd(`/matches/${apiMatchId}`, 0)
    return {
      status: data.status,
      homeScore: data.score?.fullTime?.home ?? data.score?.regularTime?.home ?? 0,
      awayScore: data.score?.fullTime?.away ?? data.score?.regularTime?.away ?? 0,
      minute: data.minute ?? null,
    }
  } catch {
    return null
  }
}

// 获取比赛阵容（开球前1小时可用）
export async function getMatchLineup(apiMatchId: number): Promise<{
  home: string[]
  away: string[]
  homeFormation: string
  awayFormation: string
} | null> {
  try {
    const data = await fd(`/matches/${apiMatchId}`, 0)
    const home = data.homeTeam?.lineup?.map((p: { name: string }) => p.name) ?? []
    const away = data.awayTeam?.lineup?.map((p: { name: string }) => p.name) ?? []
    return {
      home,
      away,
      homeFormation: data.homeTeam?.formation ?? '未知',
      awayFormation: data.awayTeam?.formation ?? '未知',
    }
  } catch {
    return null
  }
}

// 获取比赛事件（进球、红牌、换人）
export async function getMatchEvents(apiMatchId: number): Promise<Array<{
  minute: number
  type: string
  team: string
  player: string
}>> {
  try {
    const data = await fd(`/matches/${apiMatchId}`, 0)
    const goals = (data.goals ?? []).map((g: {
      minute: { regular: number }
      team: { name: string }
      scorer: { name: string }
    }) => ({
      minute: g.minute?.regular,
      type: 'GOAL',
      team: g.team?.name,
      player: g.scorer?.name,
    }))
    return goals
  } catch {
    return []
  }
}

// ——— api-football.com 接口（需要 RAPIDAPI_KEY）———

// 球队球员伤病列表（世界杯期间实时更新）
export async function getTeamInjuries(teamName: string): Promise<Array<{
  player: string
  reason: string
  status: string  // 'Injured' | 'Questionable' | 'Suspended'
}>> {
  const data = await rapid('/injuries', { league: '1', season: '2026' })
  if (!data?.response) return []
  return data.response
    .filter((i: { team: { name: string } }) => i.team?.name?.toLowerCase().includes(teamName.toLowerCase()))
    .map((i: { player: { name: string; reason: string; type: string } }) => ({
      player: i.player?.name,
      reason: i.player?.reason,
      status: i.player?.type,
    }))
}

// 球队近期战绩（最近5场）
export async function getTeamRecentForm(teamName: string): Promise<{
  wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number
} | null> {
  // 使用 football-data.org 获取球队近期比赛（世界杯小组赛）
  try {
    const data = await fd(`/competitions/${WC_ID}/matches?status=FINISHED`, 300)
    const matches = (data.matches ?? []).filter(
      (m: { homeTeam: { name: string }; awayTeam: { name: string } }) =>
        m.homeTeam?.name === teamName || m.awayTeam?.name === teamName
    ).slice(-5)

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0
    for (const m of matches) {
      const isHome = m.homeTeam?.name === teamName
      const scored = isHome ? m.score?.fullTime?.home : m.score?.fullTime?.away
      const conceded = isHome ? m.score?.fullTime?.away : m.score?.fullTime?.home
      if (scored > conceded) wins++
      else if (scored === conceded) draws++
      else losses++
      goalsFor += scored ?? 0
      goalsAgainst += conceded ?? 0
    }
    return { wins, draws, losses, goalsFor, goalsAgainst }
  } catch {
    return null
  }
}

// 汇总：一次性获取预测所需的所有球员上下文
export async function buildPlayerContext(
  homeTeam: string,
  awayTeam: string,
  apiMatchId?: number
): Promise<string> {
  const lines: string[] = []

  // 1. 获取阵容（如果比赛id已知且开球前1h内）
  if (apiMatchId) {
    const lineup = await getMatchLineup(apiMatchId)
    if (lineup?.home.length) {
      lines.push(`[${homeTeam}首发] 阵型${lineup.homeFormation}：${lineup.home.slice(0, 11).join('、')}`)
    }
    if (lineup?.away.length) {
      lines.push(`[${awayTeam}首发] 阵型${lineup.awayFormation}：${lineup.away.slice(0, 11).join('、')}`)
    }
  }

  // 2. 伤病（需要 RAPIDAPI_KEY）
  const [homeInjuries, awayInjuries] = await Promise.all([
    getTeamInjuries(homeTeam),
    getTeamInjuries(awayTeam),
  ])
  if (homeInjuries.length) {
    lines.push(`[${homeTeam}伤病] ${homeInjuries.map(i => `${i.player}（${i.status}）`).join('、')}`)
  }
  if (awayInjuries.length) {
    lines.push(`[${awayTeam}伤病] ${awayInjuries.map(i => `${i.player}（${i.status}）`).join('、')}`)
  }

  // 3. 近期战绩
  const [homeForm, awayForm] = await Promise.all([
    getTeamRecentForm(homeTeam),
    getTeamRecentForm(awayTeam),
  ])
  if (homeForm) {
    lines.push(`[${homeTeam}近期] ${homeForm.wins}胜${homeForm.draws}平${homeForm.losses}负，进${homeForm.goalsFor}球失${homeForm.goalsAgainst}球`)
  }
  if (awayForm) {
    lines.push(`[${awayTeam}近期] ${awayForm.wins}胜${awayForm.draws}平${awayForm.losses}负，进${awayForm.goalsFor}球失${awayForm.goalsAgainst}球`)
  }

  return lines.length > 0
    ? lines.join('\n')
    : '（球员数据暂未获取，请配置 FOOTBALL_DATA_API_KEY 和 RAPIDAPI_KEY）'
}
