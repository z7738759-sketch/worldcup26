const RULES = [
  {
    id: 'R1', color: '#ef4444',
    title: '资金信号识别',
    desc: '当市场资金方向与公众预期出现分歧时，跟随专业资金方向。公众情绪容易被媒体和知名度左右，而专业资金通常反映更深层信息。',
    example: '美国vs巴拉圭：公众普遍预期小球，但实际打出了高进球数，专业方向准确预判了进攻爆发。',
    when: '赛前24小时内出现明显的资金方向分歧',
  },
  {
    id: 'R2', color: '#3b82f6',
    title: '防守体系识别',
    desc: '非洲/巴尔干地区球队以低位防守见长，结构严密。当这些球队面对实力略强但非压倒性的对手时，平局概率显著上升。',
    example: '巴西vs摩洛哥：摩洛哥的严密防守让夺冠热门巴西仅取得平局，印证了防守体系在大赛中的价值。',
    when: '防守见长的球队面对实力差距不大的对手',
  },
  {
    id: 'R3', color: '#6b7f96',
    title: '势均力敌识别',
    desc: '当双方实力评分差距极小（<5%），比赛走向高度不确定，任何结果都有可能。此时不做强预测，诚实标注为均势。',
    example: '韩国vs捷克：双方实力极为接近，结果2-1体现了均势比赛的不可预测性。',
    when: '双方实力差<5%，无明显优劣势',
  },
  {
    id: 'R4', color: '#f59e0b',
    title: '首轮进攻倾向',
    desc: '世界杯首场比赛中，强队的进攻欲望通常比预期更强烈。对手尚未适应大赛节奏，防线容易出现松动。',
    example: '多场首轮比赛实际进球数超出赛前普遍预期，大赛首场球员状态和心理的特殊性。',
    when: '强队首轮比赛，对手实力差距明显',
  },
  {
    id: 'R5', color: '#a78bfa',
    title: '实力差距校准',
    desc: '当不同渠道的实力评估出现显著差异时（>30%），取保守估计。纸面实力并不总能转化为场上表现，过度自信是预测最常见的错误。',
    example: '某些看似实力悬殊的比赛，保守评估更接近真实结果。',
    when: '不同评估体系的结论差距大于30%',
  },
  {
    id: 'R6', color: '#ec4899',
    title: '特殊情境识别 · 历史性时刻',
    desc: '球队首次参加世界杯或争夺历史首积分时，往往能踢出超出实力的表现。历史性时刻的情绪驱动力是模型无法量化的因素，需要在分析中特别重视。',
    example: '卡塔尔vs瑞士：卡塔尔作为东道主兼首次参赛，在全场补时阶段打入历史首球获得平局，情绪因素不可忽视。',
    when: '一方正在经历世界杯历史性时刻（首秀/首积分/首胜）',
  },
  {
    id: 'R7', color: '#4ade80',
    title: '长期缺席效应',
    desc: '超过15年未参加世界杯的球队，首场比赛往往发挥低于正常水平。重新适应世界杯节奏需要时间。相反，近年来有世界杯经验的球队在首场更稳定。',
    example: '土耳其24年后重返世界杯，首场0-2不敌澳大利亚，长期缺席影响了球队的临场发挥。',
    when: '球队缺席世界杯超过15年后重返',
  },
]

const MODEL_RULES = [
  { title: '实力评分体系', desc: '每支球队基于历史比赛表现赋予实力分值。两队分差越大，强队获胜概率越高。赛后结果自动反馈更新评分，确保评分反映最新状态。' },
  { title: '攻防效率评估', desc: '结合球队近期进球率和失球率，计算双方预期进球数。进攻强势+防守薄弱的对阵进球偏多，防守型对阵进球偏少。' },
  { title: '持续学习机制', desc: '每场比赛结束后，实际结果自动反馈给分析模型：近期比赛权重70%，历史对战权重30%。连续出现同类误判时，自动提升该类型调整系数。' },
  { title: '战术风格匹配', desc: '不同战术风格之间存在天然克制关系。高位压迫克制控球打法，防守反击克制高位压迫。风格匹配分析作为3-6%的隐性调整因素。' },
  { title: '赛中动态追踪', desc: '比赛进行中持续更新评估：每次进球后重新计算剩余时间走势，红牌后下调受影响方效率，领先方被追平概率动态变化。' },
]

export default function MethodologyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2 text-white">分析方法论</h1>
      <p style={{ color: '#8899aa' }} className="text-base mb-2">七维分析框架 · 持续自进化 · 赛后自动反推</p>
      <p style={{ fontSize: 13, color: '#6b7f96' }} className="mb-8">
        分析框架在2026世界杯期间持续演化——每次错误预测后自动修正。当前版本已迭代至v5。
      </p>

      <section className="mb-10">
        <h2 style={{ fontSize: 14, color: '#f5a623', letterSpacing: '2px' }} className="font-bold uppercase mb-5">七维分析框架</h2>
        <div className="space-y-4">
          {RULES.map(r => (
            <div key={r.id} style={{ background: '#0d1b2a', border: '1px solid #1e3a5f', borderLeft: `3px solid ${r.color}` }}
              className="rounded-xl p-5">
              <div style={{ color: r.color }} className="font-black text-lg mb-2">{r.title}</div>
              <p className="text-sm mb-3" style={{ color: '#cdd9e5', lineHeight: 1.7 }}>{r.desc}</p>
              <div style={{ background: '#070f1a', fontSize: 12, color: '#8899aa', lineHeight: 1.6 }} className="rounded-lg p-3 mb-2">
                <span style={{ color: r.color }} className="font-bold">实战案例：</span>{r.example}
              </div>
              <div style={{ fontSize: 11, color: '#6b7f96' }}>适用条件：{r.when}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, color: '#60a5fa', letterSpacing: '2px' }} className="font-bold uppercase mb-5">底层评估体系</h2>
        <div className="space-y-3">
          {MODEL_RULES.map((r, i) => (
            <div key={i} style={{ background: '#0d1b2a', border: '1px solid #1e3a5f' }} className="rounded-xl p-5">
              <div style={{ color: '#60a5fa' }} className="font-bold text-base mb-2">{r.title}</div>
              <div style={{ fontSize: 14, color: '#8899aa', lineHeight: 1.7 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
