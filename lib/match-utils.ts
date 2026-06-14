// 国家名→ISO旗帜代码（用于 flagcdn.com）
const FLAG_CODES: Record<string, string> = {
  '德国': 'de', '库拉索': 'cw', '荷兰': 'nl', '日本': 'jp',
  '科特迪瓦': 'ci', '厄瓜多尔': 'ec', '瑞典': 'se', '突尼斯': 'tn',
  '卡塔尔': 'qa', '瑞士': 'ch', '巴西': 'br', '摩洛哥': 'ma',
  '苏格兰': 'gb-sct', '海地': 'ht', '墨西哥': 'mx', '南非': 'za',
  '韩国': 'kr', '捷克': 'cz', '加拿大': 'ca', '波黑': 'ba',
  '美国': 'us', '巴拉圭': 'py', '法国': 'fr', '阿根廷': 'ar',
  '英格兰': 'gb-eng', '葡萄牙': 'pt', '西班牙': 'es', '比利时': 'be',
  '克罗地亚': 'hr', '澳大利亚': 'au', '新西兰': 'nz', '土耳其': 'tr',
  '塞内加尔': 'sn', '伊朗': 'ir', '沙特': 'sa', '乌拉圭': 'uy',
  '佛得角': 'cv', '埃及': 'eg', '阿尔及利亚': 'dz', '刚果DR': 'cd',
  '约旦': 'jo', '乌兹别克斯坦': 'uz', '丹麦': 'dk', '波兰': 'pl',
  '哥伦比亚': 'co', '智利': 'cl', '秘鲁': 'pe', '委内瑞拉': 've',
}

export function getFlagUrl(team: string, size: '20x15' | '32x24' | '48x36' | '64x48' = '48x36'): string {
  const code = FLAG_CODES[team]
  if (!code) return ''
  return `https://flagcdn.com/${size}/${code}.png`
}

export function getFlagCode(team: string): string {
  return FLAG_CODES[team] ?? ''
}

// 从预测字符串中提取总进球数
function extractGoals(pred: string): number | null {
  // 匹配 "X-Y" 格式的比分
  const match = pred.match(/(\d+)-(\d+)/)
  if (match) return parseInt(match[1]) + parseInt(match[2])
  return null
}

export function parseTotalGoals(predA: string, predB: string): string {
  const goalsA = extractGoals(predA)
  const goalsB = extractGoals(predB)
  if (goalsA === null && goalsB === null) return ''
  if (goalsA === null) return `约${goalsB}球`
  if (goalsB === null) return `约${goalsA}球`
  const min = Math.min(goalsA, goalsB)
  const max = Math.max(goalsA, goalsB)
  return min === max ? `约${min}球` : `${min}-${max}球`
}

// 将 M规则+notes 转换为专业分析语言（不暴露M规则名）
const RULE_TO_ANALYSIS: Record<string, string> = {
  'M1': '盘口资金流向显示专业机构押注大球，公众与机构方向相反时应跟随机构判断',
  'M2': '亚盘水位显示双方实力接近，低防御体系下平局概率显著高于市场隐含值',
  'M3': '三方赔率差距极小，任何方向均属小优势，比赛结果高度开放',
  'M4': '强攻球队首场大赛，对手心理压力偏高，高进球数概率被系统性低估',
  'M5': '主流庄家与散户庄家赔率差距超30%，真实胜率低于市场表面数据',
  'M6': '首届世界杯参赛队争取历史首积分意志强烈，情绪价值被市场低估，平局不可忽视',
  'ASIA': '亚洲球队在大赛逆境中的实际表现普遍优于市场预期，历史数据支持上调胜率',
}

export function rulesToAnalysis(rules: string[]): string[] {
  return rules.map(r => RULE_TO_ANALYSIS[r]).filter(Boolean)
}
