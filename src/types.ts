import type { ImageSourcePropType } from 'react-native';

export type TabKey = 'discover' | 'map' | 'saved' | 'profile';
export type Category = '全部' | '音乐' | '市集' | '户外' | '体育' | '手作' | '展览' | '美食';
export type TimeKey = '现在' | '今天' | '明天' | '本周末';

export type Creator = {
  id: string;
  name: string;
  craft: string;
  district: string;
  bio: string;
  image: ImageSourcePropType;
  verified: boolean;
  openStudio: boolean;
  tags: string[];
};

export type Work = {
  id: string;
  creatorId: string;
  name: string;
  material: string;
  price: string;
  image: ImageSourcePropType;
  limited: boolean;
  customizable: boolean;
};

export type EventGift = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  price: string;
  badge: '官方限定' | '现场限定' | '创作者联名' | '免费赠品';
  saleWindow: string;
  purchaseMethod: '现场购买' | '线上购买' | '预订后领取';
  requiresTicket: boolean;
  stockLabel?: string;
  verified: boolean;
};

export type CityEvent = {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<Category, '全部'>;
  dateKey: TimeKey;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  district: string;
  address: string;
  price: string;
  ticketNote: string;
  image: ImageSourcePropType;
  accent: string;
  mapX: number;
  mapY: number;
  organizer: string;
  organizerType: string;
  source: string;
  verifiedAt: string;
  description: string;
  creatorIds: string[];
  tags: string[];
  accessibility?: string;
  gifts?: EventGift[];
};

export type MapLayer = '活动' | '创作者';
