import { getStandings } from '@/lib/football-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const standings = await getStandings()
  return Response.json({ standings })
}
