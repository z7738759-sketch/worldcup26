/**
 * 用当前 Poisson 模型重新生成所有比赛的 A/B/C 预测
 * 取联合概率最高的前3个比分，保证全站算法一致
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, 'data')

const predictions = JSON.parse(fs.readFileSync(path.join(DATA, 'predictions.json'), 'utf-8'))
const teamStats   = JSON.parse(fs.readFileSync(path.join(DATA, 'team-stats.json'), 'utf-8'))
const modelState  = JSON.parse(fs.readFileSync(path.join(DATA, 'model-state.json'), 'utf-8'))

const CALIBRATED_ELO = modelState.elo || {}
const TEAM_ADJ       = modelState.teamSpecificAdjustments || {}

const TEAM_ELO_BASE = {
  '阿根廷':2148,'法国':2062,'巴西':2075,'西班牙':2030,'英格兰':1999,'葡萄牙':1986,
  '德国':2002,'荷兰':1971,'比利时':1950,'克罗地亚':1924,'摩洛哥':1910,'墨西哥':1913,
  '乌拉圭':1885,'塞内加尔':1862,'哥伦比亚':1871,'瑞典':1851,'科特迪瓦':1851,
  '美国':1858,'韩国':1845,'挪威':1845,'澳大利亚':1811,'苏格兰':1817,
  '捷克':1820,'土耳其':1822,'伊朗':1760,'日本':1898,'奥地利':1865,
  '加拿大':1793,'厄瓜多尔':1779,'新西兰':1710,'波黑':1762,'巴拉圭':1750,'突尼斯':1759,
  '沙特':1750,'埃及':1780,'阿尔及利亚':1720,'瑞士':1868,'丹麦':1871,
  '卡塔尔':1678,'刚果DR':1700,'佛得角':1680,'南非':1640,'库拉索':1602,'海地':1621,
  '加纳':1740,'伊拉克':1600,'约旦':1550,'乌兹别克斯坦':1640,'巴拿马':1580,
}

const CONF_STRENGTH  = { UEFA:1.00, CONMEBOL:0.97, CONCACAF:0.92, CAF:0.90, AFC:0.88, OFC:0.82 }
// 乌拉圭 defendRate=0.6 已在 team-stats 中体现，不再叠加 DEFENSIVE 惩罚
const DEFENSIVE_TEAMS = new Set(['摩洛哥','突尼斯','埃及','伊朗','克罗地亚','波黑','苏格兰','海地','厄瓜多尔'])
const FIRST_TIMERS    = new Set(['库拉索','佛得角','刚果DR'])

function getElo(team)   { return CALIBRATED_ELO[team] ?? TEAM_ELO_BASE[team] ?? 1750 }
function getStats(team) { return teamStats[team] ?? { attackRate:1.8, defendRate:0.9, pressureIndex:0.70, confoedrStrength:'UEFA' } }

function poissonPMF(lambda, k) {
  if (k < 0 || lambda <= 0) return k === 0 ? Math.exp(-lambda) : 0
  let logP = -lambda
  for (let i = 1; i <= k; i++) logP += Math.log(lambda / i)
  return Math.exp(logP)
}

function computeLambdas(homeTeam, awayTeam) {
  const eloH = getElo(homeTeam), eloA = getElo(awayTeam)
  const diff = eloH - eloA
  const hs = getStats(homeTeam), as_ = getStats(awayTeam)
  const confH = CONF_STRENGTH[hs.confoedrStrength] ?? 0.90
  const confA = CONF_STRENGTH[as_.confoedrStrength] ?? 0.90

  let lH = hs.attackRate * (as_.defendRate / 1.0) * (confH * hs.pressureIndex)
  let lA = as_.attackRate * (hs.defendRate / 1.0) * (confA * as_.pressureIndex)

  if      (diff > 350)  { lH *= 1.15; lA *= 0.85 }
  else if (diff > 250)  { lH *= 1.12; lA *= 0.88 }
  else if (diff > 150)  { lH *= 1.08; lA *= 0.93 }
  else if (diff > 80)   { lH *= 1.04; lA *= 0.96 }
  else if (diff < -350) { lA *= 1.15; lH *= 0.85 }
  else if (diff < -250) { lA *= 1.12; lH *= 0.88 }
  else if (diff < -150) { lA *= 1.08; lH *= 0.93 }
  else if (diff < -80)  { lA *= 1.04; lH *= 0.96 }

  if (DEFENSIVE_TEAMS.has(homeTeam)) lA *= (diff <= -80 ? 0.92 : 0.85)
  if (DEFENSIVE_TEAMS.has(awayTeam)) lH *= (diff >= 80  ? 0.92 : 0.85)

  const hAdj = TEAM_ADJ[homeTeam] || {}, aAdj = TEAM_ADJ[awayTeam] || {}
  if (hAdj.attackBoost)   lH *= (1 + hAdj.attackBoost)
  if (aAdj.attackBoost)   lA *= (1 + aAdj.attackBoost)
  if (hAdj.defenseBoost)  lA /= (1 + hAdj.defenseBoost)
  if (aAdj.defenseBoost)  lH /= (1 + aAdj.defenseBoost)
  if (hAdj.formBonus)     lH *= (1 + hAdj.formBonus)
  if (aAdj.formBonus)     lA *= (1 + aAdj.formBonus)
  if (hAdj.tacticalBonus) lH *= (1 + hAdj.tacticalBonus * 0.5)
  if (aAdj.tacticalBonus) lA *= (1 + aAdj.tacticalBonus * 0.5)

  const total = lH + lA
  if (total < 1.2) { const s = 1.2 / total; lH *= s; lA *= s }

  const cap = Math.abs(diff) > 350 ? 7.0 : 5.0
  const afterCap = lH + lA
  if (afterCap > cap) { const s = cap / afterCap; lH *= s; lA *= s }

  if (FIRST_TIMERS.has(awayTeam)) lA = Math.max(lA, 1.0)
  if (FIRST_TIMERS.has(homeTeam)) lH = Math.max(lH, 1.0)

  // 主场优势（世界杯主场队/FIFA排列首位队有统计优势）
  lH *= 1.10

  return [+lH.toFixed(3), +lA.toFixed(3)]
}

/** 联合 Poisson 概率最高的前 N 个比分 */
function topScores(lH, lA, n = 3, maxG = 10) {
  const scores = []
  for (let h = 0; h <= maxG; h++)
    for (let a = 0; a <= maxG; a++)
      scores.push({ h, a, p: poissonPMF(lH, h) * poissonPMF(lA, a) })
  scores.sort((x, y) => y.p - x.p)
  return scores.slice(0, n)
}

/** 胜平负概率（求和法） */
function dirProbs(lH, lA, maxG = 15) {
  let home = 0, draw = 0, away = 0
  for (let h = 0; h <= maxG; h++)
    for (let a = 0; a <= maxG; a++) {
      const p = poissonPMF(lH, h) * poissonPMF(lA, a)
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
    }
  return { home, draw, away }
}

/** M8a：ELO差小时平局底线 */
function applyM8a(dirs, eloDiff) {
  const absDiff = Math.abs(eloDiff)
  let floor = 0
  if (absDiff < 50)  floor = 0.33
  else if (absDiff < 100) floor = 0.31
  else if (absDiff < 150) floor = 0.29
  if (floor > 0 && dirs.draw < floor) {
    const excess = floor - dirs.draw
    const total = dirs.home + dirs.away
    dirs.home -= excess * (dirs.home / total)
    dirs.away -= excess * (dirs.away / total)
    dirs.draw = floor
  }
  return dirs
}

/** 总进球泊松区间（覆盖 65%） */
function goalsInterval(lambda) {
  const mode = Math.floor(lambda)
  let lo = mode, hi = mode, cov = poissonPMF(lambda, mode)
  while (cov < 0.65 && (lo > 0 || hi < 14)) {
    const pLo = lo > 0 ? poissonPMF(lambda, lo - 1) : 0
    const pHi = hi < 14 ? poissonPMF(lambda, hi + 1) : 0
    if (pLo >= pHi && lo > 0) { lo--; cov += poissonPMF(lambda, lo) }
    else { hi++; cov += poissonPMF(lambda, hi) }
  }
  return { lo, hi }
}

/** 预测文本：始终以主队名+H-A格式（平局用"平局"前缀） */
function fmtPred(homeTeam, h, a) {
  if (h === a) return `平局 ${h}-${a}`
  return `${homeTeam} ${h}-${a}`
}

/** 从预测文本推导方向（H-A格式，主队分数在前） */
function dirFromPred(predText) {
  const m = predText && predText.match(/(\d+)-(\d+)/)
  if (!m) return 'draw'
  const h = parseInt(m[1]), a = parseInt(m[2])
  return h > a ? 'home' : h < a ? 'away' : 'draw'
}

// ─── 主循环 ───────────────────────────────────────────────
let dirHits = 0, exactHits = 0, goalsHits = 0, finished = 0

for (const p of predictions) {
  if (p.actualScore) {
    // ── 已完成比赛：predA/B/C 永久锁定，只更新 winDrawLoss 和对错字段 ──
    const [hg, ag] = p.actualScore.split('-').map(Number)
    const actual = hg > ag ? 'home' : ag > hg ? 'away' : 'draw'

    // winDrawLoss = predA 方向
    p.winDrawLoss = dirFromPred(p.predictionA)

    p.directionCorrect = p.winDrawLoss === actual
    p.exactHit = [p.predictionA, p.predictionB, p.predictionC].some(pred => {
      const m = pred && pred.match(/(\d+)-(\d+)/)
      return m && `${m[1]}-${m[2]}` === p.actualScore
    })
    const predNum = p.totalGoalsPrediction ? parseInt(p.totalGoalsPrediction) : null
    p.totalGoalsDirectionCorrect = predNum !== null ? (hg + ag) === predNum : false

    finished++
    if (p.directionCorrect) dirHits++
    if (p.exactHit) exactHits++
    if (p.totalGoalsDirectionCorrect) goalsHits++

    const d = p.directionCorrect ? '✅' : '❌'
    const e = p.exactHit ? ' 🎯' : ''
    console.log(`${p.homeTeam} vs ${p.awayTeam} [${p.winDrawLoss}]${d}${e}  A=${p.predictionA}  实际=${p.actualScore}`)
  } else {
    // ── 未开踢比赛：用更新后的模型重新生成全部预测 ──
    const [lH, lA] = computeLambdas(p.homeTeam, p.awayTeam)

    const top3 = topScores(lH, lA, 3)
    const sumP  = top3.reduce((s, t) => s + t.p, 0)

    p.predictionA = fmtPred(p.homeTeam, top3[0].h, top3[0].a)
    p.predictionB = fmtPred(p.homeTeam, top3[1].h, top3[1].a)
    p.predictionC = fmtPred(p.homeTeam, top3[2].h, top3[2].a)

    const pA = Math.round(top3[0].p / sumP * 100)
    const pB = Math.round(top3[1].p / sumP * 100)
    p.probabilityA = pA
    p.probabilityB = pB
    p.probabilityC = 100 - pA - pB

    // winDrawLoss = predA 方向（与展示一致）
    p.winDrawLoss = dirFromPred(p.predictionA)

    p.lambdaHome = lH
    p.lambdaAway = lA
    const mA = p.predictionA.match(/(\d+)-(\d+)/)
    const predATotal = mA ? parseInt(mA[1]) + parseInt(mA[2]) : Math.round(lH + lA)
    p.totalGoalsPrediction = `${predATotal}球`

    console.log(`${p.homeTeam} vs ${p.awayTeam} [${p.winDrawLoss}]  A=${p.predictionA}  B=${p.predictionB}  C=${p.predictionC}  λH=${lH} λA=${lA}`)
  }
}

fs.writeFileSync(path.join(DATA, 'predictions.json'), JSON.stringify(predictions, null, 2))

console.log(`\n━━━━ 模型准确率（${finished}场已完成） ━━━━`)
console.log(`📊 胜平负:  ${dirHits}/${finished} = ${Math.round(dirHits/finished*100)}%`)
console.log(`🎯 比分精确: ${exactHits}/${finished} = ${Math.round(exactHits/finished*100)}%`)
console.log(`⚽ 总进球:  ${goalsHits}/${finished} = ${Math.round(goalsHits/finished*100)}%`)
console.log(`\n✅ 已更新 predictions.json（${predictions.length} 场）`)
