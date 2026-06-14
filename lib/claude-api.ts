import Anthropic from '@anthropic-ai/sdk'
import type { Analysis, OddsLine } from './types'
import { computeModelOutput } from './model'
import { getBaseModelState, buildModelContext } from './model-state'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const M_RULES = `
M1 反向线路移动（RLM）：赔率朝公众方向移动但Sharp资金押反方 → 永远跟Sharp
M2 亚盘≤-0.75+差距<15%：平局概率升级至32-35%（巴尔干/非洲低防适用）
M3 三方赔率差<10%：标注"硬币博弈"，不给强方向预测
M4 首轮大球倾向：强进攻热门队首场Over 2.5比预期更可靠
M5 不同庄家差>30%：bet365更接近真实概率（Sharp友好）
M6 庄家差>30%+首次参赛：平局必须进预测B（不给大胜预测）
M7 长期缺席重返>15年：首场爆冷风险+15%，该队胜率-5%+平局+3%（土耳其验证）
ASIA 亚洲球队逆境力+10%：日本/韩国等真实胜率高于市场约10%
`

const HIDDEN_MODEL_RULES = `
你的内部分析框架（不需要对外解释，但必须用于推理）：

**五行分析（用于评估气场优势，仅作内部权重）：**
- 木克土，土克水，水克火，火克金，金克木
- 进攻型球队（火属性）vs 防守型（土属性）→ 火克土，进攻方气场占优
- 流动型打法（水属性）vs 强度型（火属性）→ 水克火，流动方战术占优
- 此分析作为0-6%的隐性调整系数，不写入最终报告

**风水因素（作为概率调整）：**
- 主场优势（主队球迷支持）：+3%胜率调整
- 傍晚场次（14-20点，球员状态峰值）：+2%进球数期望
- 旅途疲劳（跨洲客队）：-5%客队攻击效率
- 这些因素合并入EV计算，不单独列出

**数学大模型（泊松回归+贝叶斯）：**
- 已提供预计进球数（xG，基于ELO和攻防评分）
- 使用泊松分布计算每种比分概率
- 贝叶斯先验：近期5场结果给予70%权重，历史对阵30%权重
- 将此概率与市场隐含概率对比，找到价值偏差

**比赛进行中的动态调整（实时更新）：**
- 每次进球后，重新计算剩余时间×进球速率
- 红牌后，降低10人球队进攻效率20%
- 先进球后对手反攻概率+15%（数据支撑）
`

export async function generateMatchAnalysis(params: {
  matchId: number
  homeTeam: string
  awayTeam: string
  group: string
  kickoff: string
  odds: OddsLine[]
  extraContext: string
  isLiveUpdate?: boolean
  liveMinute?: number
  liveScore?: { home: number; away: number }
}): Promise<Analysis> {
  // 注入最新模型状态（反推校正后的ELO、规则权重、历史教训）
  const currentState = getBaseModelState()
  const dynamicContext = buildModelContext(currentState, params.homeTeam, params.awayTeam)

  // 从模型状态读取校正后的ELO（覆盖model.ts中的硬编码值）
  const calibratedEloHome = currentState.elo[params.homeTeam] ?? undefined
  const calibratedEloAway = currentState.elo[params.awayTeam] ?? undefined

  const modelOutput = computeModelOutput(
    params.homeTeam,
    params.awayTeam,
    params.kickoff,
    { calibratedEloHome, calibratedEloAway }
    // 注意：claude-api.ts 不传 predictionA/B，因为这里正在生成新预测
    // 总进球此时使用泊松模型，等预测写入 predictions.json 后会自动一致
  )

  const oddsText = params.odds.map(o =>
    `${o.bookmaker}${o.isSharpFriendly ? '(Sharp友好)' : ''}: 主胜${o.homeWin} 平局${o.draw} 客胜${o.awayWin}`
  ).join('\n')

  const liveContext = params.isLiveUpdate
    ? `\n⚽ 比赛进行中！当前 ${params.liveMinute}分钟，比分：${params.liveScore?.home}-${params.liveScore?.away}。请根据当前比分重新计算剩余时间的胜平负概率，并更新预测。`
    : ''

  const prompt = `你是一位结合量化金融和体育分析的顶级足球预测专家。请对以下比赛进行深度分析，用中文回答。

比赛：${params.homeTeam} vs ${params.awayTeam}（${params.group}）
开球时间：${params.kickoff}
${liveContext}

**数学模型预测（已计算，供你参考验证）：**
- ELO评分：${params.homeTeam} ${modelOutput.eloHome} vs ${params.awayTeam} ${modelOutput.eloAway}
- 模型胜平负概率：主胜${modelOutput.homeWinPct}% / 平局${modelOutput.drawPct}% / 客胜${modelOutput.awayWinPct}%
- 预计进球：${params.homeTeam} ${modelOutput.expectedGoalsHome} / ${params.awayTeam} ${modelOutput.expectedGoalsAway}
- 模型置信度：${modelOutput.confidence === 'high' ? '高（ELO差距显著）' : modelOutput.confidence === 'medium' ? '中等' : '低（势均力敌）'}

**赔率数据：**
${oddsText}

**背景信息：**
${params.extraContext}

**⚡ 模型实时状态（反推校正后，必须遵守）：**
${dynamicContext}

**分析规则（M1-M7+亚洲规则）：**
${M_RULES}

**隐性分析框架（用于内部推理，提升准确性）：**
${HIDDEN_MODEL_RULES}

请严格按以下JSON格式输出（不要加markdown代码块，纯JSON）：
{
  "mRules": [
    {"id": "M1", "triggered": true, "reason": "具体原因"},
    {"id": "M2", "triggered": false, "reason": "具体原因"},
    {"id": "M3", "triggered": false, "reason": "具体原因"},
    {"id": "M4", "triggered": false, "reason": "具体原因"},
    {"id": "M5", "triggered": false, "reason": "具体原因"},
    {"id": "M6", "triggered": false, "reason": "具体原因"},
    {"id": "M7", "triggered": false, "reason": "具体原因"},
    {"id": "ASIA", "triggered": false, "reason": "具体原因"}
  ],
  "reasoning": [
    {"title": "实力与ELO评估", "detail": "基于ELO评分、近期战绩、伤病综合分析两队当前实力...", "conclusion": "→ 结论"},
    {"title": "战术与风格碰撞", "detail": "分析两队战术体系，高位压迫vs低位防反，进攻流动性...", "conclusion": "→ 结论"},
    {"title": "数学概率与泊松模型", "detail": "模型给出主胜X%/平局Y%/客胜Z%，市场隐含概率为...，偏差为...，泊松预计最高概率比分为...", "conclusion": "→ 结论"},
    {"title": "资本信号与期望值", "detail": "bet365 vs 对手赔率差距分析，EV计算：EV = 胜率 × 赔率 - (1-胜率)，识别正EV赌注...", "conclusion": "→ 结论"}
  ],
  "predictionA": "最可能结果，如：平局 1-1",
  "predictionB": "次可能结果，如：荷兰 2-1",
  "confidence": "高/中/低",
  "bettingValue": [
    {"stars": 3, "name": "赌注名称", "odds": "+265", "evCalc": "EV = 0.42 × 3.65 - 0.58 = +0.95", "logic": "推荐逻辑：数学模型概率42%高于市场隐含27%，正EV显著", "status": "pending"}
  ],
  "aiInsight": "120字左右的深度洞察，综合ELO差距/五行能量/资本信号，给出最终判断，供首页横幅使用"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  const parsed = JSON.parse(text)

  return {
    matchId: params.matchId,
    generatedAt: new Date().toISOString(),
    odds: params.odds,
    mRules: parsed.mRules,
    reasoning: parsed.reasoning,
    predictionA: parsed.predictionA,
    predictionB: parsed.predictionB,
    confidence: parsed.confidence,
    bettingValue: parsed.bettingValue ?? [],
    aiInsight: parsed.aiInsight,
    modelScore: {
      homeWinPct: modelOutput.homeWinPct,
      drawPct: modelOutput.drawPct,
      awayWinPct: modelOutput.awayWinPct,
      expectedGoalsHome: modelOutput.expectedGoalsHome,
      expectedGoalsAway: modelOutput.expectedGoalsAway,
      eloHome: modelOutput.eloHome,
      eloAway: modelOutput.eloAway,
    },
  }
}
