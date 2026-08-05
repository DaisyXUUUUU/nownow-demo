import type { Category, CityEvent, Creator, Work } from './types';

const images = {
  music: require('../assets/events/lake-music-v2.png'),
  coffee: require('../assets/events/coffee-festival-v2.png'),
  moto: require('../assets/events/moto-club-v2.png'),
  bamboo: require('../assets/events/bamboo-workshop-v2.png'),
  ceramic: require('../assets/events/ceramic-artist-v2.png'),
  craft: require('../assets/events/craft-market-v2.png'),
};

export const categories: Category[] = ['全部', '音乐', '市集', '户外', '体育', '手作', '展览', '美食'];

export const creators: Creator[] = [
  {
    id: 'c-ye', name: '叶青竹作', craft: '东阳竹编 · 当代器物', district: '金东区',
    bio: '第三代竹编手艺人，把传统起底编法做成真正进入日常的灯、篮与桌面器物。工作室每月只开放两个周末。',
    image: images.bamboo, verified: true, openStudio: true, tags: ['非遗', '可定制', '工作室开放'],
  },
  {
    id: 'c-lin', name: '林间陶所', craft: '手捏陶 · 日用器', district: '婺城区',
    bio: '主理人林之遥用金华本地土与植物灰创作小批量器皿，每一季的釉色都只出现一次。',
    image: images.ceramic, verified: true, openStudio: false, tags: ['小批量', '季节限定', '手作课'],
  },
  {
    id: 'c-miao', name: '苗念工作室', craft: '织物首饰 · 民艺再设计', district: '义乌市',
    bio: '从旧布、植物染和传统纹样出发，制作轻巧、可佩戴的地方记忆。周末会带着作品在不同城市移动。',
    image: images.craft, verified: false, openStudio: false, tags: ['移动摊位', '植物染', '独立设计'],
  },
  {
    id: 'c-feng', name: '风物印社', craft: '木刻版画 · 城市观察', district: '兰溪市',
    bio: '把老街、菜场和公交站刻进小幅版画。没有固定店铺，只在展览和周末市集出现。',
    image: images.craft, verified: true, openStudio: false, tags: ['版画', '城市限定', '移动创作者'],
  },
];

export const works: Work[] = [
  { id: 'w-1', creatorId: 'c-ye', name: '风穿六角竹灯', material: '毛竹 / 棉纸', price: '¥680', image: images.bamboo, limited: true, customizable: true },
  { id: 'w-2', creatorId: 'c-ye', name: '随行茶篮', material: '毛竹 / 黄铜', price: '¥298', image: images.bamboo, limited: false, customizable: true },
  { id: 'w-3', creatorId: 'c-lin', name: '雨后青灰杯', material: '本地土 / 草木灰釉', price: '¥168', image: images.ceramic, limited: true, customizable: false },
  { id: 'w-4', creatorId: 'c-lin', name: '两人食器组', material: '手捏陶', price: '¥520', image: images.ceramic, limited: false, customizable: true },
  { id: 'w-5', creatorId: 'c-miao', name: '婺州花结胸针', material: '植物染棉麻 / 银', price: '¥138', image: images.craft, limited: true, customizable: false },
  { id: 'w-6', creatorId: 'c-miao', name: '夏日果实手链', material: '旧布 / 陶珠', price: '¥96', image: images.craft, limited: false, customizable: true },
  { id: 'w-7', creatorId: 'c-feng', name: '金华站台 No.3', material: '手工木刻 / 棉纸', price: '¥220', image: images.craft, limited: true, customizable: false },
];

export const events: CityEvent[] = [
  {
    id: 'e-wta', title: 'WTA500 金华网球公开赛', subtitle: '世界级女子网球赛事与只在赛期出现的城市纪念', category: '体育', dateKey: '本周末', dateLabel: '本周六–下周日', timeLabel: '11:00–21:30', venue: '金华体育中心', district: '婺城区', address: '双龙南街 2688 号', price: '¥80 起', ticketNote: '分日场票与全日票；礼物区无需进入主赛场', image: images.moto, accent: '#3157C8', mapX: 26, mapY: 74, organizer: '金华国际网球公开赛组委会', organizerType: '赛事主办方', source: '官方赛事日历', verifiedAt: '今天 12:10 核验', description: '在现场看一场高水平网球比赛，也可以把这座城市与本届赛事共同留下的限定纪念带回家。礼物均标注获取方式、发售期限与是否需要门票。', creatorIds: [], tags: ['国际赛事', '亲子友好', '有限时礼物'], accessibility: '场馆设无障碍入口与轮椅观赛区，建议购票前联系主办方确认席位。',
    gifts: [
      { id: 'g-wta-cap', name: '金华站限定网球帽', description: '赛事年份与城市坐标刺绣，只在本站赛期发售。', image: images.moto, price: '¥168', badge: '官方限定', saleWindow: '仅本周六–下周日', purchaseMethod: '现场购买', requiresTicket: false, stockLabel: '限量 500 件', verified: true },
      { id: 'g-wta-ball', name: '赛事纪念球', description: '带本届赛事标志与金华站专属包装。', image: images.coffee, price: '¥98', badge: '现场限定', saleWindow: '比赛结束即停售', purchaseMethod: '预订后领取', requiresTicket: false, stockLabel: '每日限量', verified: true },
      { id: 'g-wta-pin', name: '婺州城市徽章', description: '网球轨迹与婺州窗棂纹样组成的城市礼物。', image: images.craft, price: '¥39', badge: '创作者联名', saleWindow: '售完即止', purchaseMethod: '现场购买', requiresTicket: false, verified: true },
    ],
  },
  {
    id: 'e-music', title: '鹿女湖晚风音乐会', subtitle: '六组本地乐队，在日落和湖风里演出', category: '音乐', dateKey: '今天', dateLabel: '今天 · 7月31日', timeLabel: '18:30–21:30', venue: '鹿女湖草坪', district: '婺城区', address: '鹿女湖游客中心东侧草坪', price: '免费', ticketNote: '无需预约，建议自带坐垫', image: images.music, accent: '#F2643F', mapX: 72, mapY: 20, organizer: '鹿女湖青年营地', organizerType: '本地社群', source: '主办方公众号', verifiedAt: '今天 09:20 核验', description: '一场真正属于夏夜的湖边演出。现场有轻食、手冲咖啡和本地创作者的小型摊位，最后一组演出后有自由 jam。', creatorIds: ['c-miao'], tags: ['日落', '宠物友好', '可野餐'], accessibility: '草坪入口有缓坡，雨天可能泥泞',
  },
  {
    id: 'e-coffee', title: '金华城市咖啡节', subtitle: '28 家独立咖啡店和烘焙品牌集合', category: '美食', dateKey: '现在', dateLabel: '正在发生', timeLabel: '10:00–20:30', venue: '银泰天地中央广场', district: '婺城区', address: '解放东路168号', price: '¥29 起', ticketNote: '现场购券，部分工作坊需预约', image: images.coffee, accent: '#266D5B', mapX: 48, mapY: 48, organizer: '一杯金华', organizerType: '城市生活品牌', source: '官方小红书', verifiedAt: '今天 11:08 核验', description: '不只是喝咖啡。你可以参加风味盲测、杯测入门和拉花体验，也能在“本地制造”区域认识陶艺、织物与插画创作者。', creatorIds: ['c-lin', 'c-miao'], tags: ['室外', '可购买', '工作坊'],
  },
  {
    id: 'e-moto', title: '北山弯道骑行开放日', subtitle: '新手也能参加的摩托车社群见面会', category: '户外', dateKey: '本周末', dateLabel: '本周六', timeLabel: '08:00–13:00', venue: '双龙风景区 3 号平台', district: '婺城区', address: '罗电线北山观景平台', price: '¥60', ticketNote: '需在线报名；限 80 人', image: images.moto, accent: '#3454A3', mapX: 34, mapY: 15, organizer: '北山弯道俱乐部', organizerType: '运动社群', source: '俱乐部群公告', verifiedAt: '昨天 22:10 核验', description: '包含安全说明、编队骑行与山顶咖啡。没有摩托车也可以作为摄影或观众报名，现场设有装备交换角。', creatorIds: [], tags: ['户外', '社群活动', '需报名'],
  },
  {
    id: 'e-bamboo', title: '一根竹子的周末', subtitle: '从破篾开始，完成一只随身小篮', category: '手作', dateKey: '明天', dateLabel: '明天 · 8月1日', timeLabel: '14:00–17:30', venue: '叶青竹作工作室', district: '金东区', address: '岭下镇诗后山村 12 号', price: '¥268', ticketNote: '含材料；剩余 4 席', image: images.bamboo, accent: '#9B6A37', mapX: 81, mapY: 64, organizer: '叶青竹作', organizerType: '创作者工作室', source: '创作者本人提交', verifiedAt: '今天 08:45 核验', description: '工作室难得的开放日。你会学习选竹、破篾与基础编织，完成一只可以带走的小篮。活动后可以参观作品档案和竹林。', creatorIds: ['c-ye'], tags: ['非遗', '小班', '可带走作品'],
  },
  {
    id: 'e-ceramic', title: '夜陶：把今天留在杯子上', subtitle: '不追求标准答案的两小时手捏体验', category: '手作', dateKey: '今天', dateLabel: '今天 · 7月31日', timeLabel: '19:00–21:00', venue: '林间陶所', district: '婺城区', address: '八一南街艺术仓 2F', price: '¥198', ticketNote: '预约制；含一次烧制', image: images.ceramic, accent: '#7B5751', mapX: 43, mapY: 72, organizer: '林间陶所', organizerType: '独立工作室', source: '创作者本人提交', verifiedAt: '今天 10:32 核验', description: '从当天的一种情绪出发，在杯壁留下纹理、文字或一个小小的形状。作品烧制后可自取或邮寄。', creatorIds: ['c-lin'], tags: ['夜间', '手作课', '适合独自参加'],
  },
  {
    id: 'e-market', title: '婺州夏日独立创作集', subtitle: '插画、织物、旧物与地方风味的小型市集', category: '市集', dateKey: '本周末', dateLabel: '周六–周日', timeLabel: '15:00–21:00', venue: '古子城保宁门广场', district: '婺城区', address: '飘萍路古子城南入口', price: '免费', ticketNote: '自由入场', image: images.craft, accent: '#C84063', mapX: 57, mapY: 58, organizer: '城南造物社', organizerType: '独立策展团队', source: '主办方公众号', verifiedAt: '今天 09:55 核验', description: '只邀请小批量创作与本人出摊的周末市集。除了购买作品，也可以报名植物拓印、旧布改造和儿童纸艺体验。', creatorIds: ['c-ye', 'c-miao', 'c-feng'], tags: ['艺术家本人在场', '亲子', '夜市'],
  },
  {
    id: 'e-print', title: '城南有印：小幅版画展', subtitle: '十五位青年作者记录他们眼中的金华', category: '展览', dateKey: '现在', dateLabel: '展期至 8月16日', timeLabel: '11:00–19:00', venue: '万佛塔公园西门展厅', district: '婺城区', address: '飘萍路 153 号', price: '免费', ticketNote: '周一闭馆', image: images.craft, accent: '#3157C8', mapX: 62, mapY: 43, organizer: '风物印社', organizerType: '创作者联合项目', source: '场地方官方日历', verifiedAt: '今天 08:15 核验', description: '从公交车窗、老菜场到雨后的金华江，十五位作者用木刻和丝网印刷留下自己的城市切片。周日下午有免费导览。', creatorIds: ['c-feng'], tags: ['室内', '免费导览', '作品可购买'],
  },
];

export const categoryGlyph: Record<Exclude<Category, '全部'>, string> = {
  音乐: '♫', 市集: '集', 户外: '野', 体育: '动', 手作: '作', 展览: '展', 美食: '味',
};
