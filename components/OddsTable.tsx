import type { OddsLine } from '@/lib/types'

export default function OddsTable({ odds }: { odds: OddsLine[] }) {
  if (!odds.length) return null
  const homeOdds = odds.map(o => o.homeWin)
  const gap = homeOdds.length > 1
    ? Math.abs(oddsToProb(homeOdds[0]) - oddsToProb(homeOdds[homeOdds.length - 1])) * 100
    : 0

  return (
    <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-5">
      <h3 style={{ color: '#6b7f96', fontSize: 10 }} className="font-bold tracking-widest uppercase mb-4">📊 赔率深度对比</h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ fontSize: 10, color: '#6b7f96', borderBottom: '1px solid #1e3a5f' }}>
            <th className="text-left pb-2">庄家</th>
            <th className="text-center pb-2">主胜</th>
            <th className="text-center pb-2">平局</th>
            <th className="text-center pb-2">客胜</th>
          </tr>
        </thead>
        <tbody>
          {odds.map((o, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #060d18' }}>
              <td className="py-2 text-xs" style={{ color: '#6b7f96' }}>
                {o.bookmaker}
                {o.isSharpFriendly && <span className="ml-1 text-green-400" style={{ fontSize: 9 }}>Sharp</span>}
              </td>
              <td className="py-2 text-center font-bold" style={{ color: '#cdd9e5' }}>{o.homeWin}</td>
              <td className="py-2 text-center font-bold" style={{ color: '#f5a623' }}>{o.draw}</td>
              <td className="py-2 text-center font-bold" style={{ color: '#cdd9e5' }}>{o.awayWin}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {gap > 30 && (
        <p className="mt-3 text-red-400" style={{ fontSize: 11 }}>
          ⚠️ M5触发：庄家差距 {gap.toFixed(0)}% &gt; 30%，参考Sharp友好庄家（bet365）
        </p>
      )}
    </div>
  )
}

function oddsToProb(o: string): number {
  if (o.startsWith('+')) return 100 / (Number(o.slice(1)) + 100)
  return Math.abs(Number(o)) / (Math.abs(Number(o)) + 100)
}
