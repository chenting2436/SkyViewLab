import {
  getSectionWorkbenches,
  sections,
  type SectionKey,
  type Workbench,
} from '@/lib/platform-data';
import { navItems } from '@/lib/navigation';
import { translateText, type Locale } from '@/lib/i18n';

export type PageGuideMessage = {
  role: 'assistant' | 'user';
  content: string;
  links?: Array<{ slug: string; title: string }>;
};

const sectionIntros: Record<SectionKey, { zh: string; en: string }> = {
  research: {
    zh: '本页属于「科研成果」：查文献、管知识、辅助写论文与报告、地学分析、科普动画与研究流程。默认列出本类全部功能；也可悬停顶栏「科研成果」旁箭头，按意图筛选。',
    en: 'This page is Research: literature, knowledge, writing help, geoscience analysis, science animation, and research workflows. All tools show by default; hover the chevron beside Research in the top nav to filter by intent.',
  },
  engineering: {
    zh: '本页属于「工程与产业化」：灾害评估、监测预警、巡检与应急、数据接入，以及专利交底与转化评估。默认列出本类全部功能；也可悬停顶栏箭头按意图筛选。',
    en: 'This page is Engineering: disaster assessment, monitoring and warning, inspection and emergency response, data intake, plus patent disclosure and transfer. All tools show by default; use the top-nav chevron to filter by intent.',
  },
  teaching: {
    zh: '本页属于「教学」：学编程、做练习与判题、课程项目推进与提交、表格数据清洗。默认列出本类全部功能；也可悬停顶栏箭头按意图筛选。',
    en: 'This page is Teaching: programming, practice and judging, course projects and submission, and table cleaning. All tools show by default; use the top-nav chevron to filter by intent.',
  },
};

function pick(locale: Locale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

function localizedWorkbench(workbench: Workbench, locale: Locale) {
  return {
    ...workbench,
    title: translateText(workbench.title, locale),
    description: translateText(workbench.description, locale),
  };
}

export function getPageGuideSectionLabel(sectionKey: SectionKey, locale: Locale = 'zh') {
  const item = navItems.find((entry) => entry.href === `/${sectionKey}`);
  if (item) return locale === 'zh' ? item.label : item.labelEn;
  return translateText(sections[sectionKey].title, locale);
}

export function getPageGuideQuickPrompts(sectionKey: SectionKey, locale: Locale = 'zh') {
  if (sectionKey === 'engineering') {
    return [
      pick(locale, '这一页是干什么的？', 'What is this page for?'),
      pick(locale, '我想做监测预警点哪个？', 'Which tool for monitoring and warning?'),
      pick(locale, '专利相关有哪些？', 'What patent tools are here?'),
      pick(locale, '有哪些工具可以选？', 'What tools can I choose?'),
    ];
  }
  if (sectionKey === 'teaching') {
    return [
      pick(locale, '这一页是干什么的？', 'What is this page for?'),
      pick(locale, '我想学编程点哪个？', 'Which tool for learning to code?'),
      pick(locale, '做题和判题有哪些？', 'What practice and judging tools are here?'),
      pick(locale, '有哪些工具可以选？', 'What tools can I choose?'),
    ];
  }
  return [
    pick(locale, '这一页是干什么的？', 'What is this page for?'),
    pick(locale, '我想查文献点哪个？', 'Which tool for literature search?'),
    pick(locale, '写论文相关有哪些？', 'What writing-related tools are here?'),
    pick(locale, '有哪些工具可以选？', 'What tools can I choose?'),
  ];
}

function scoreWorkbench(workbench: Workbench, query: string) {
  const haystack = [
    workbench.title,
    workbench.description,
    ...workbench.tags,
    ...workbench.capabilities,
  ]
    .join(' ')
    .toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/[\s,，。？?、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  let score = 0;
  for (const token of tokens) {
    if (workbench.title.toLowerCase().includes(token)) score += 6;
    if (haystack.includes(token)) score += 2;
  }

  const aliases: Array<[RegExp, string[]]> = [
    [/文献|论文检索|查文献|雷达|literature|paper search/, ['文献发现', '矿山安全证据库']],
    [/矿山|矿安|mine safety/, ['矿山安全证据库']],
    [/知识库|管知识|资料入库|knowledge/, ['研究知识库']],
    [/写论文|润色|改写|扩写|writing|polish/, ['论文写作辅助']],
    [/报告|材料问答|出处|report/, ['材料报告助手']],
    [/地震|波形|震相|seismic|waveform/, ['地震与物理分析']],
    [/面波|噪声|成像|ambient|noise/, ['背景噪声面波成像']],
    [/动画|科普|Manim|animation/, ['科学动画工作室']],
    [/流程|编排|自动化|workflow|orchestr/, ['研究流程编排']],
    [/Agent|技能|Skill/, ['Agent 技能管理']],
    [/遥感|损毁|remote.?sensing|damage/, ['遥感损毁评估']],
    [/边坡|稳定|slope/, ['边坡稳定性分析']],
    [/监测|预警|告警|monitor|warning/, ['灾害监测预警平台']],
    [/融合|多源|fusion/, ['多源监测融合']],
    [/无人机|巡检|UAV|drone|inspect/, ['无人机巡检']],
    [/应急|研判|emergency/, ['应急研判中心']],
    [/数据网关|接入|数据流|gateway/, ['数据网关']],
    [/交底|专利交底|disclosure/, ['专利交底书']],
    [/专利转化|FTO|TRL|patent transfer/, ['专利转化评估']],
    [/Python|编程实验|编译|lab/, ['Python 编译器']],
    [/英语|词汇|english|vocab/, ['Python 编程英语']],
    [/题库|做题|练习|practice|quiz/, ['题库练习']],
    [/判题|测试提交|Judge|judging/, ['在线判题']],
    [/项目协作|看板|里程碑|project collab|kanban/, ['项目协作']],
    [/项目提交|提交包|submission/, ['项目提交']],
    [/清洗|表格|clean|table/, ['数据清洗']],
  ];

  for (const [pattern, titles] of aliases) {
    if (pattern.test(query) && titles.includes(workbench.title)) {
      score += 8;
    }
  }

  return score;
}

function recommendCards(sectionKey: SectionKey, query: string, limit = 2) {
  return getSectionWorkbenches(sectionKey)
    .map((workbench) => ({ workbench, score: scoreWorkbench(workbench, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.workbench);
}

export function answerPageGuide(
  sectionKey: SectionKey,
  rawQuery: string,
  locale: Locale = 'zh',
): PageGuideMessage {
  const query = rawQuery.trim();
  const cards = getSectionWorkbenches(sectionKey).map((item) =>
    localizedWorkbench(item, locale),
  );
  const label = getPageGuideSectionLabel(sectionKey, locale);
  const intro = sectionIntros[sectionKey][locale];

  if (
    !query ||
    /这一页|本页|干什么|做什么|用途|是啥|简介|what is this|what.?s this page|purpose|about this page/i.test(
      query,
    )
  ) {
    return {
      role: 'assistant',
      content: pick(
        locale,
        `${intro}\n\n当前共有 ${cards.length} 个功能入口。滚动浏览后点「打开工具」，或继续问「我想……点哪个」。`,
        `${intro}\n\nThere are ${cards.length} tools here. Scroll the feature list and click Open tool, or ask “which tool for …”.`,
      ),
    };
  }

  if (/有哪些|全部|列表|工具可以选|what tools|list tools|all tools/i.test(query)) {
    return {
      role: 'assistant',
      content: pick(
        locale,
        `「${label}」下的功能：\n${cards.map((card, index) => `${index + 1}. ${card.title}：${card.description}`).join('\n')}`,
        `Tools under ${label}:\n${cards.map((card, index) => `${index + 1}. ${card.title}: ${card.description}`).join('\n')}`,
      ),
      links: cards.map((card) => ({ slug: card.slug, title: card.title })),
    };
  }

  const matched = recommendCards(sectionKey, query).map((item) =>
    localizedWorkbench(item, locale),
  );
  if (matched.length > 0) {
    const lines = matched.map((card, index) =>
      pick(
        locale,
        `${index === 0 ? '优先' : '也可'}点「${card.title}」——${card.description}`,
        `${index === 0 ? 'Start with' : 'Also try'} “${card.title}” — ${card.description}`,
      ),
    );
    return {
      role: 'assistant',
      content: pick(
        locale,
        `按你的描述，建议在本页这样选：\n${lines.join('\n')}`,
        `Based on what you described, try this on this page:\n${lines.join('\n')}`,
      ),
      links: matched.map((card) => ({ slug: card.slug, title: card.title })),
    };
  }

  return {
    role: 'assistant',
    content: pick(
      locale,
      `我暂时只根据本页「${label}」的功能来推荐。可以换个说法，例如「我想查文献」「我想做监测预警」，或问「有哪些工具可以选」。若目标在其他大类，请用顶栏切换。`,
      `I only recommend tools on this “${label}” page. Try another phrasing, e.g. “literature search” or “monitoring and warning”, or ask “what tools can I choose?”. Switch sections from the top nav if you need another category.`,
    ),
  };
}

export function createPageGuideWelcome(
  sectionKey: SectionKey,
  locale: Locale = 'zh',
): PageGuideMessage {
  return {
    role: 'assistant',
    content: pick(
      locale,
      `${sectionIntros[sectionKey].zh}\n\n你可以问本页用途，或描述你想做的事，我会推荐要点哪个功能。`,
      `${sectionIntros[sectionKey].en}\n\nAsk what this page is for, or describe what you want to do—I'll suggest which tool to open.`,
    ),
  };
}
