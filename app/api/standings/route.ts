import { getStandings } from '@/lib/football-api'

export async function GET() {
  const standings = await getStandings()
  return Response.json({ standings })
}
