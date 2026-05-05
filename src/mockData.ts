import { Signal, Topic, WatchlistItem, LibraryItem, Category } from './types';

export const CORE_DOMAINS: Category[] = [
  'AI', 'Crypto', 'Stocks', 'Robotics', 'Energy', 'US Policy', 'China Policy', 'Australia Policy', 'Macro', 'Geopolitics'
];

export const FOLLOWED_TOPIC_OPTIONS = [
  'AI Data Center Power Demand',
  'Nuclear Energy',
  'US Chip Export Controls',
  'China AI Policy',
  'Australia Critical Minerals',
  'Bitcoin ETF',
  'Stablecoin Regulation',
  'Humanoid Robotics',
  'AI Agents',
  'Semiconductor Supply Chain',
];

export const MUTED_TOPIC_OPTIONS = [
  'Meme Coins',
  'Celebrity Drama',
  'Low-quality Rumors',
];

export const TOPIC_MODAL_GROUPS = {
  Policy: [
    'US Policy',
    'China Policy',
    'Australia Policy',
    'Macro',
    'Geopolitics',
    'US Chip Export Controls',
    'China AI Policy',
    'Australia Critical Minerals',
    'Stablecoin Regulation',
  ],
  Technology: [
    'AI',
    'Humanoid Robotics',
    'AI Agents',
    'AI Data Center Power Demand',
    'Semiconductor Supply Chain',
  ],
  Markets: [
    'Crypto',
    'Stocks',
    'Macro',
    'Geopolitics',
    'Bitcoin ETF',
    'Stablecoin Regulation',
  ],
  Energy: [
    'Energy',
    'Nuclear Energy',
    'AI Data Center Power Demand',
    'Australia Critical Minerals',
  ],
};

export const SUGGESTED_TOPICS = [
  'US Policy',
  'China Policy',
  'Australia Policy',
  'Macro',
  'Geopolitics',
  'AI Data Center Power Demand',
  'Nuclear Energy',
  'US Chip Export Controls',
  'China AI Policy',
  'Australia Critical Minerals',
  'Bitcoin ETF',
  'Stablecoin Regulation',
  'Humanoid Robotics',
  'AI Agents',
  'Semiconductor Supply Chain',
];

export const AVAILABLE_TOPICS = {
  Policy: TOPIC_MODAL_GROUPS.Policy,
  Technology: [...TOPIC_MODAL_GROUPS.Technology, 'Battery Tech'],
  Markets: [...TOPIC_MODAL_GROUPS.Markets, 'NVIDIA Earnings'],
  Recommended: SUGGESTED_TOPICS,
};

export const MOCK_SIGNALS: Signal[] = [
  {
    id: 's1',
    categories: ['AI', 'US Policy'],
    topics: ['AI Agents', 'AI Regulation'],
    entities: ['OpenAI', 'Microsoft'],
    importance: 9.8,
    titleZh: 'OpenAI 发布全新推理模型，具备更强的逻辑思考能力。',
    titleEn: 'OpenAI releases a new reasoning model with stronger logical capabilities.',
    summaryZh: '此模型代表了从“快速模式识别”向“深思熟虑”的范式转变。它能解决复杂的数学和编程问题，减少幻觉，直接威胁到谷歌在高级认知推理领域的领先地位，并可能重塑自动化软件工程 market。',
    whyItMatters: [
      'Eliminates RAG dependency for many enterprise use cases',
      'Improves long-context analysis',
      'Changes workflows for media, legal, research, and software teams'
    ],
    source: 'Reuters',
    timestamp: '2 hrs ago',
    tags: ['MSFT', 'OpenAI', 'GPT-o1'],
    glossary: [
      { term: 'Inference', definition: '推理 - 模型根据已有证据得出结论的过程' },
      { term: 'Context Window', definition: '上下文窗口 - 模型一次处理的信息量' },
      { term: 'Multimodal', definition: '多模态 - 同时理解文本、图像、视频的能力' }
    ]
  },
  {
    id: 's2',
    categories: ['Crypto', 'US Policy'],
    topics: ['Stablecoin Regulation', 'Bitcoin ETF'],
    entities: ['SEC', 'BlackRock'],
    importance: 8.5,
    titleZh: 'SEC 批准首批现货以太坊 ETF 上市交易。',
    titleEn: 'SEC approves the first spot Ethereum ETFs for trading.',
    summaryZh: '这是加密货币融入传统金融体系的又一重要里程碑。预计将带来大量机构资金流入，巩固以太坊作为全球第二大数字资产的地位。',
    whyItMatters: [
      'Institutional adoption path cleared',
      'Increased market liquidity',
      'Regulatory precedent for altcoins'
    ],
    source: 'Bloomberg',
    timestamp: '5 hrs ago',
    tags: ['ETH', 'SEC', 'BlackRock']
  },
  {
    id: 's3',
    categories: ['Energy', 'AI'],
    topics: ['Nuclear Energy', 'AI Data Center Power Demand'],
    entities: ['Microsoft', 'Constellation Energy'],
    importance: 9.2,
    titleZh: '微软签署核能协议，为 AI 数据中心提供清洁能源。',
    titleEn: 'Microsoft signs nuclear deal to power AI data centers.',
    summaryZh: '微软与 Constellation Energy 签署协定，重启三里岛核电站的一个反应堆，专门用于满足其日益增长的 AI 电力需求。',
    whyItMatters: [
      'Nuclear energy renaissance',
      'Sustainability in big tech',
      'Energy independence for data centers'
    ],
    source: 'CNBC',
    timestamp: '1 day ago',
    tags: ['MSFT', 'Nuclear', 'CleanEnergy']
  },
  {
    id: 's4',
    categories: ['Robotics', 'Energy'],
    topics: ['Humanoid Robotics', 'Battery Tech'],
    entities: ['Tesla'],
    importance: 7.8,
    titleZh: '特斯拉展示最新一代 Optimus 机器人生产线集成。',
    titleEn: 'Tesla demonstrates latest Optimus Gen-2 factory integration.',
    summaryZh: '马斯克展示了 Optimus 机器人在弗里蒙特工厂进行电池分拣的自主作业能力，标志着人形机器人从实验室走向实际生产。',
    whyItMatters: [
      'Labor cost reduction potential',
      'Manufacturing automation leap',
      'Integration of AI and hardware'
    ],
    source: 'The Verge',
    timestamp: '6 hrs ago',
    tags: ['TSLA', 'Optimus', 'Robotics']
  },
  {
    id: 's5',
    categories: ['US Policy', 'China Policy'],
    topics: ['US Chip Export Controls', 'Semiconductor Supply Chain'],
    entities: ['NVIDIA', 'TSMC'],
    importance: 9.5,
    titleZh: '美国商务部拟对 AI 芯片出口实施更严格限制。',
    titleEn: 'US Commerce Dept plans stricter AI chip export controls.',
    summaryZh: '拜登政府正考虑限制中国获取最尖端的 AI 架构（如 GAA 技术），此举旨在通过控制算力和算法双重手段，维系美国在 AI 军备竞赛中的领先地位。',
    whyItMatters: [
      'Heightened geopolitical tensions',
      'Impact on chip designer revenue',
      'Accelerated domestic alternatives in China'
    ],
    source: 'Financial Times',
    timestamp: '10 hrs ago',
    tags: ['Geopolitics', 'AI Chips', 'TradeWar']
  }
];

export const MOCK_TOPICS: Topic[] = [
  {
    id: 't1',
    category: 'AI',
    name: 'AI Data Center Power Demand',
    momentum: 94,
    explanationZh: '由于主要科技公司宣布新建千兆瓦级数据中心，对先进冷却系统和下一代核能的机构兴趣激增。',
    tags: ['NVDA', 'MSFT', 'Constellation'],
    signalCount: 142
  },
  {
    id: 't2',
    category: 'Energy',
    name: 'Nuclear Energy',
    momentum: 88,
    explanationZh: '随着科技巨头寻求全天候零碳能源，核能正经历从退役到复兴的战略转折。',
    tags: ['SMR', 'Uranium', 'CEG'],
    signalCount: 67
  },
  {
    id: 't3',
    category: 'US Policy',
    name: 'US Chip Export Controls',
    momentum: 82,
    explanationZh: '政策制定者正在审查针对先进计算和半导体制造能力的出口管制效用。',
    tags: ['DOC', 'BIS', 'NVIDIA'],
    signalCount: 45
  },
  {
    id: 't4',
    category: 'Crypto',
    name: 'Bitcoin ETF',
    momentum: 72,
    explanationZh: '机构投资者正通过现货ETF渠道稳定配置数字资产，降低了市场的波动性基准。',
    tags: ['BTC', 'IBIT', 'FBTC'],
    signalCount: 89
  }
];

export const MOCK_WATCHLIST: WatchlistItem[] = [
  {
    id: 'w1',
    name: 'NVIDIA',
    type: 'Company',
    status: 'Critical Supply Chain Update',
    importantUpdates: 3,
    totalMentions: 12,
    value: '$824.15',
    valueTrend: 'up',
    description: 'NVIDIA is the leading designer of graphics processing units (GPUs) that are essential for AI workloads.'
  },
  {
    id: 'w2',
    name: 'OpenAI',
    type: 'Organization',
    status: 'Stable',
    importantUpdates: 1,
    totalMentions: 45
  },
  {
    id: 'w3',
    name: 'Bitcoin',
    type: 'Crypto',
    status: 'High Volatility',
    importantUpdates: 2,
    totalMentions: 104,
    value: '$64,120',
    valueTrend: 'down'
  },
  {
    id: 'w4',
    name: 'Elon Musk',
    type: 'Person',
    status: 'High Signal',
    importantUpdates: 5,
    totalMentions: 210
  }
];

export const MOCK_LIBRARY: LibraryItem[] = [
  {
    id: 'l1',
    source: 'Bloomberg',
    date: 'Oct 24, 2023',
    title: 'Global Supply Chain Reorganization Driven by AI Logistics',
    summaryZh: 'AI 驱动的物流系统正在重塑全球供应链，提高库存周转率并降低成本。',
    whyItMatters: '传统物流逻辑被颠覆，SaaS 解决方案迎来爆发期。',
    tags: ['AI', 'SupplyChain'],
    category: 'Investment Research'
  },
  {
    id: 'l2',
    source: 'Financial Times',
    date: 'Sep 12, 2023',
    title: 'Precision Medicine Breakthroughs in Genomic Sequencing',
    summaryZh: '基因测序技术的进步正在开启个性化医疗的新篇章，降低了罕见病诊断的成本。',
    whyItMatters: '医疗保健行业将从治疗转向预防，初创企业机会巨大。',
    tags: ['BioTech', 'Health'],
    category: 'Tech Trends'
  }
];
