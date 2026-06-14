import { getStandingsFromPredictions } from '@/lib/predictions'
import Image from 'next/image'
import { getFlagUrl } from '@/lib/match-utils'

export const revalidate = 300

function FlagImg({ team }: { team: string }) {
  const url = getFlagUrl(team, '20x15')
  if (!url) return <div style={{ width: 20, height: 15, background: '#1e3a5f', borderRadius: 2, flexShrink: 0 }} />
  return <Image src={url} alt={team} width={20} height={15} style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} unoptimized />
}

const COL_WIDTHS = {
  pos: 28,
  flag: 24,
  team: 0,      // flex-1
  played: 32,
  won: 32,
  drawn: 32,
  lost: 32,
  gd: 36,
  pts: 36,
}

function HeaderRow() {
  return (
    <div style={{
      background: '#111f30',
      borderBottom: '1px solid #1e3a5f',
      fontSize: 13,
      color: '#3d5470',
      fontWeight: 700,
      letterSpacing: '1px',
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      textAlign: 'center',
    }}>
      <div style={{ width: COL_WIDTHS.pos }}>#</div>
      <div style={{ width: COL_WIDTHS.flag }} />
      <div style={{ flex: 1, textAlign: 'left', paddingLeft: 8 }}>球队</div>
      <div style={{ width: COL_WIDTHS.played }}>场</div>
      <div style={{ width: COL_WIDTHS.won }}>胜</div>
      <div style={{ width: COL_WIDTHS.drawn }}>平</div>
      <div style={{ width: COL_WIDTHS.lost }}>负</div>
      <div style={{ width: COL_WIDTHS.gd }}>净胜</div>
      <div style={{ width: COL_WIDTHS.pts, color: '#6b7f96' }}>积分</div>
    </div>
  )
}

interface TeamRow {
  position: number
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

function TeamRow({ row, isTop2 }: { row: TeamRow; isTop2: boolean }) {
  const gdColor = row.gd > 0 ? '#4ade80' : row.gd < 0 ? '#f87171' : '#6b7f96'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      borderBottom: '1px solid #0a1628',
      borderLeft: `2px solid ${isTop2 ? '#16a34a' : 'transparent'}`,
      fontSize: 14,
    }}>
      {/* 排名 */}
      <div style={{ width: COL_WIDTHS.pos, color: '#6b7f96', fontSize: 13, flexShrink: 0 }}>
        {row.position}
      </div>
      {/* 国旗 */}
      <div style={{ width: COL_WIDTHS.flag, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <FlagImg team={row.team} />
      </div>
      {/* 队名 */}
      <div style={{ flex: 1, color: 'white', fontWeight: 600, paddingLeft: 8, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {row.team}
      </div>
      {/* 数据列：全部右对齐 */}
      <div style={{ width: COL_WIDTHS.played, textAlign: 'center', color: '#6b7f96', flexShrink: 0 }}>{row.played}</div>
      <div style={{ width: COL_WIDTHS.won, textAlign: 'center', color: row.won > 0 ? '#4ade80' : '#6b7f96', flexShrink: 0 }}>{row.won}</div>
      <div style={{ width: COL_WIDTHS.drawn, textAlign: 'center', color: row.drawn > 0 ? '#f5a623' : '#6b7f96', flexShrink: 0 }}>{row.drawn}</div>
      <div style={{ width: COL_WIDTHS.lost, textAlign: 'center', color: row.lost > 0 ? '#f87171' : '#6b7f96', flexShrink: 0 }}>{row.lost}</div>
      <div style={{ width: COL_WIDTHS.gd, textAlign: 'center', color: gdColor, flexShrink: 0 }}>
        {row.gd > 0 ? `+${row.gd}` : row.gd}
      </div>
      <div style={{ width: COL_WIDTHS.pts, textAlign: 'center', color: '#f5a623', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
        {row.pts}
      </div>
    </div>
  )
}

export default async function StandingsPage() {
  const standings = getStandingsFromPredictions()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-1 text-white">小组积分榜</h1>
      <p style={{ color: '#6b7f96' }} className="text-sm mb-6">
        实时反映已完成比赛结果 · 未开赛球队积分显示为0
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, overflowX: 'auto' }}>
        {standings.map(group => (
          <div key={group.group} style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl overflow-hidden">
            {/* 组别标题 */}
            <div style={{ background: 'linear-gradient(90deg,#111f30,#0d1b2a)', padding: '10px 16px', borderBottom: '1px solid #1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#f5a623', fontWeight: 900, letterSpacing: '2px' }}>
                {group.group.replace('组', ' 组')}
              </span>
              {group.table.length < 4 && (
                <span style={{ fontSize: 9, color: '#f59e0b', background: '#1a2d45', padding: '2px 8px', borderRadius: 9999 }}>
                  ⚠ 小组信息待完善
                </span>
              )}
            </div>

            <HeaderRow />

            {group.table.map((row, i) => (
              <TeamRow key={row.team} row={row} isTop2={i < 2} />
            ))}

            {/* 不足4队时显示占位提示 */}
            {group.table.length < 4 && (
              <div style={{ padding: '10px 16px', borderTop: '1px dashed #1e3a5f', textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#3d5470' }}>
                  此小组还有 {4 - group.table.length} 支球队未录入，积分待更新
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {standings.length === 0 && (
        <div style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-12 text-center mt-4">
          <div className="text-3xl mb-3">⚽</div>
          <div style={{ color: '#6b7f96' }} className="text-sm">暂无积分数据</div>
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 11, color: '#3d5470' }} className="flex items-center gap-4">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#16a34a', display: 'inline-block', borderRadius: 2 }} />
          晋级资格（前2名）
        </span>
        <span>净胜球 = 进球 − 失球</span>
      </div>
    </div>
  )
}
