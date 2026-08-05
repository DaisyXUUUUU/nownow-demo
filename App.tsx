import { Ionicons } from '@expo/vector-icons';
import { load as loadAMap } from '@amap/amap-jsapi-loader';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { categories, creators, events, works } from './src/data';
import { colors, radius } from './src/theme';
import type { Category, CityEvent, Creator, EventGift, MapLayer, TabKey, TimeKey, Work } from './src/types';

const timeFilters: TimeKey[] = ['现在', '今天', '明天', '本周末'];
const creatorMapPosition: Record<string, { x: number; y: number }> = {
  'c-ye': { x: 79, y: 65 },
  'c-lin': { x: 42, y: 72 },
  'c-miao': { x: 56, y: 57 },
  'c-feng': { x: 63, y: 43 },
};
const eventGeoPosition: Record<string, [number, number]> = {
  'e-wta': [119.6429, 29.0548],
  'e-music': [119.6922, 29.1125],
  'e-coffee': [119.6527, 29.0846],
  'e-moto': [119.5908, 29.1456],
  'e-bamboo': [119.7558, 29.0624],
  'e-ceramic': [119.6412, 29.0758],
  'e-market': [119.6508, 29.1088],
  'e-print': [119.6578, 29.1108],
};
const creatorGeoPosition: Record<string, [number, number]> = {
  'c-ye': [119.7518, 29.0648],
  'c-lin': [119.6428, 29.0738],
  'c-miao': [119.6675, 29.1025],
  'c-feng': [119.6238, 29.0916],
};
const eventMapEmoji: Record<string, string> = {
  'e-wta': '🎾',
  'e-music': '🎵',
  'e-coffee': '☕️',
  'e-moto': '🏍️',
  'e-bamboo': '🧺',
  'e-ceramic': '🏺',
  'e-market': '🛍️',
  'e-print': '🖼️',
};
const creatorMapEmoji: Record<string, string> = {
  'c-ye': '🧺',
  'c-lin': '🏺',
  'c-miao': '🧵',
  'c-feng': '🖼️',
};
const assistantPrompts = ['今晚两个人去哪儿？', '200 元内的限定礼物', '周末带孩子玩什么？', '下雨天适合去哪儿？'];

function getAssistantResponse(question: string) {
  const normalized = question.trim().toLowerCase();
  if (normalized.includes('礼物') || normalized.includes('送') || normalized.includes('纪念')) {
    return { text: 'WTA500 金华站有 3 件赛期限定礼物，全部在 200 元以内，而且礼物区无需进入主赛场。我把获取方式和截止时间也整理好了。', eventIds: ['e-wta'], giftFocus: true };
  }
  if (normalized.includes('今晚') || normalized.includes('今天') || normalized.includes('约会')) {
    return { text: '今晚可以先去城市咖啡节逛一圈，再去鹿女湖听晚风音乐会。两个地点氛围轻松，一个适合聊天，一个适合把夜晚拉长。', eventIds: ['e-coffee', 'e-music'], giftFocus: false };
  }
  if (normalized.includes('孩子') || normalized.includes('亲子')) {
    return { text: '周末更推荐 WTA500 网球公开赛和婺州夏日独立创作集：前者有亲子友好设施，后者有儿童纸艺体验，安排半天比较从容。', eventIds: ['e-wta', 'e-market'], giftFocus: false };
  }
  if (normalized.includes('雨') || normalized.includes('室内')) {
    return { text: '下雨天优先考虑室内活动。我找到版画展、夜陶和咖啡节，前两项更安静，咖啡节则更适合和朋友一起。', eventIds: ['e-print', 'e-ceramic', 'e-coffee'], giftFocus: false };
  }
  if (normalized.includes('周末')) {
    return { text: '这个周末既有赛事、户外骑行，也有夜间市集。我先按“容易参加、体验差异明显”挑了 3 个。', eventIds: ['e-wta', 'e-moto', 'e-market'], giftFocus: false };
  }
  const matches = events.filter((event) => `${event.title}${event.subtitle}${event.tags.join('')}`.toLowerCase().includes(normalized)).slice(0, 3);
  return { text: matches.length ? '我在 NowNow 当前数据里找到了这些相关内容，点击卡片可以继续查看时间、地点与报名信息。' : '我暂时没找到完全匹配的内容，先给你看看今天最值得去的几个现场。你也可以补充时间、人数或预算。', eventIds: (matches.length ? matches : events.slice(0, 3)).map((event) => event.id), giftFocus: false };
}

type JoinKind = 'organizer' | 'creator' | null;
type UtilityKind = 'notifications' | 'city' | 'reminders' | 'verification' | 'feedback' | 'about' | 'contact' | null;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <SafeAreaProvider>
      {showSplash ? <SplashScreen onFinish={() => setShowSplash(false)} /> : <NowNowApp />}
    </SafeAreaProvider>
  );
}

function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { width } = useWindowDimensions();
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const runX = useRef(new Animated.Value(-420)).current;
  const runBob = useRef(new Animated.Value(0)).current;
  const runLean = useRef(new Animated.Value(0)).current;
  const jumpY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyLift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const story = Animated.sequence([
      Animated.parallel([
        Animated.timing(runX, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(runLean, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(runBob, { toValue: -12, duration: 132, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(runBob, { toValue: 0, duration: 132, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]), { iterations: 3 }),
        Animated.sequence([
          Animated.delay(250),
          Animated.parallel([
            Animated.timing(copyOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(copyLift, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 1.2, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 0.72, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(jumpY, { toValue: -52, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleX, { toValue: 0.9, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1.15, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(jumpY, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleX, { toValue: 1.14, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 0.78, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 1, duration: 120, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1, duration: 120, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
      ]),
      Animated.delay(160),
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);

    story.start(({ finished }) => { if (finished) onFinish(); });
    return () => story.stop();
  }, [copyLift, copyOpacity, jumpY, onFinish, runBob, runLean, runX, scaleX, scaleY, screenOpacity]);

  const mascotRotate = runLean.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['-12deg', '5deg', '0deg'] });
  const dustOpacity = runX.interpolate({ inputRange: [-420, -90, 0], outputRange: [0, 0.72, 0] });
  const shadowScale = jumpY.interpolate({ inputRange: [-52, 0], outputRange: [0.52, 1] });
  const shadowOpacity = jumpY.interpolate({ inputRange: [-52, 0], outputRange: [0.12, 0.32] });

  return (
    <View style={styles.splashDesktopStage}>
      <Animated.View style={[styles.splashStage, width > 520 && styles.splashPhoneDesktop, { opacity: screenOpacity }]}> 
        <StatusBar hidden />
        <View style={styles.splashGlow} />
        <Animated.View style={[styles.splashDust, { opacity: dustOpacity, transform: [{ translateX: runX }] }]}>
          <View style={styles.splashDustLarge} /><View style={styles.splashDustMedium} /><View style={styles.splashDustSmall} />
        </Animated.View>
        <Animated.View style={[styles.splashGroundShadow, { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }]} />
        <Animated.View style={[styles.splashMascotWrap, { transform: [{ translateX: runX }, { translateY: runBob }, { translateY: jumpY }, { rotate: mascotRotate }, { scaleX }, { scaleY }] }]}> 
          <Image source={require('./assets/nownow-mascot.png')} style={styles.splashMascot} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.splashCopy, { opacity: copyOpacity, transform: [{ translateY: copyLift }] }]}> 
          <Text style={styles.splashWordmark}>NowNow</Text>
          <Text style={styles.splashChinese}>闹 闹</Text>
          <Text style={styles.splashTagline}>此刻，就在附近</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function NowNowApp() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('discover');
  const [selectedEvent, setSelectedEvent] = useState<CityEvent | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<string[]>(['e-music']);
  const [savedCreatorIds, setSavedCreatorIds] = useState<string[]>(['c-lin']);
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  const [selectedTime, setSelectedTime] = useState<TimeKey | null>(null);
  const [query, setQuery] = useState('');
  const [mapLayer, setMapLayer] = useState<MapLayer>('活动');
  const [mapZoom, setMapZoom] = useState(12.5);
  const [joinKind, setJoinKind] = useState<JoinKind>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [editorialOpen, setEditorialOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState<UtilityKind>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesCategory = selectedCategory === '全部' || event.category === selectedCategory;
      const matchesTime = !selectedTime || event.dateKey === selectedTime || (selectedTime === '今天' && event.dateKey === '现在');
      const giftText = event.gifts?.map((gift) => `${gift.name}${gift.badge}`).join('') ?? '';
      const haystack = `${event.title}${event.subtitle}${event.venue}${event.district}${event.tags.join('')}${giftText}`.toLowerCase();
      return matchesCategory && matchesTime && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [query, selectedCategory, selectedTime]);

  const flashToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1600);
  };

  const toggleEventSave = (event: CityEvent) => {
    setSavedEventIds((current) => {
      const isSaved = current.includes(event.id);
      flashToast(isSaved ? '已从收藏中移除' : '已收藏，出发前提醒你');
      return isSaved ? current.filter((id) => id !== event.id) : [...current, event.id];
    });
  };

  const toggleCreatorSave = (creator: Creator) => {
    setSavedCreatorIds((current) => {
      const isSaved = current.includes(creator.id);
      flashToast(isSaved ? '已取消关注' : `已关注 ${creator.name}`);
      return isSaved ? current.filter((id) => id !== creator.id) : [...current, creator.id];
    });
  };

  const renderTab = () => {
    if (tab === 'map') {
      return (
        <MapScreen
          events={visibleEvents}
          savedEventIds={savedEventIds}
          savedCreatorIds={savedCreatorIds}
          query={query}
          setQuery={setQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          layer={mapLayer}
          setLayer={setMapLayer}
          zoom={mapZoom}
          setZoom={setMapZoom}
          openEvent={setSelectedEvent}
          openCreator={setSelectedCreator}
          openCity={() => setUtilityOpen('city')}
          openFilter={() => setFilterOpen(true)}
        />
      );
    }

    if (tab === 'saved') {
      return (
        <SavedScreen
          savedEventIds={savedEventIds}
          savedCreatorIds={savedCreatorIds}
          openEvent={setSelectedEvent}
          openCreator={setSelectedCreator}
          explore={() => setTab('discover')}
          openCity={() => setUtilityOpen('city')}
        />
      );
    }

    if (tab === 'profile') {
      return <ProfileScreen isLoggedIn={isLoggedIn} openAuth={() => setAuthOpen(true)} openJoin={setJoinKind} openUtility={setUtilityOpen} />;
    }

    return (
      <DiscoverScreen
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        openEvent={setSelectedEvent}
        openCreator={setSelectedCreator}
        openMap={() => setTab('map')}
        savedEventIds={savedEventIds}
        toggleEventSave={toggleEventSave}
        openNotifications={() => setUtilityOpen('notifications')}
        openEditorial={() => setEditorialOpen(true)}
        openCity={() => setUtilityOpen('city')}
      />
    );
  };

  return (
    <View style={styles.stage}>
      <View style={[styles.phone, width > 520 && styles.phoneDesktop]}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {renderTab()}
        </SafeAreaView>
        <AssistantFab onPress={() => setAssistantOpen(true)} />
        <BottomNav active={tab} onChange={setTab} />
        {toast ? <View style={styles.toast}><Ionicons name="checkmark-circle" size={18} color={colors.white} /><Text style={styles.toastText}>{toast}</Text></View> : null}
      </View>

      <EventDetail
        event={selectedEvent}
        close={() => setSelectedEvent(null)}
        saved={selectedEvent ? savedEventIds.includes(selectedEvent.id) : false}
        toggleSave={() => selectedEvent && toggleEventSave(selectedEvent)}
        openCreator={(creator) => {
          setSelectedEvent(null);
          setTimeout(() => setSelectedCreator(creator), 150);
        }}
        action={(message) => flashToast(message)}
      />
      <CreatorDetail
        creator={selectedCreator}
        close={() => setSelectedCreator(null)}
        saved={selectedCreator ? savedCreatorIds.includes(selectedCreator.id) : false}
        toggleSave={() => selectedCreator && toggleCreatorSave(selectedCreator)}
        openEvent={(event) => {
          setSelectedCreator(null);
          setTimeout(() => setSelectedEvent(event), 150);
        }}
        contact={() => {
          setSelectedCreator(null);
          setTimeout(() => setUtilityOpen('contact'), 150);
        }}
      />
      <JoinModal kind={joinKind} close={() => setJoinKind(null)} submit={() => {
        setJoinKind(null);
        flashToast('提交成功，Demo 已记录');
      }} />
      <AssistantModal
        visible={assistantOpen}
        close={() => setAssistantOpen(false)}
        openEvent={(event) => {
          setAssistantOpen(false);
          setTimeout(() => setSelectedEvent(event), 150);
        }}
      />
      <AuthModal visible={authOpen} loggedIn={isLoggedIn} close={() => setAuthOpen(false)} complete={() => {
        setAuthOpen(false);
        setIsLoggedIn(true);
        flashToast('登录成功，已进入 Demo 账号');
      }} logout={() => {
        setAuthOpen(false);
        setIsLoggedIn(false);
        flashToast('已退出 Demo 账号');
      }} />
      <EditorialModal visible={editorialOpen} close={() => setEditorialOpen(false)} openCreator={(creator) => {
        setEditorialOpen(false);
        setTimeout(() => setSelectedCreator(creator), 150);
      }} openEvent={(event) => {
        setEditorialOpen(false);
        setTimeout(() => setSelectedEvent(event), 150);
      }} action={flashToast} />
      <FilterModal visible={filterOpen} close={() => setFilterOpen(false)} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
      <UtilityModal kind={utilityOpen} close={() => setUtilityOpen(null)} action={(message) => {
        setUtilityOpen(null);
        flashToast(message);
      }} />
    </View>
  );
}

function DiscoverScreen({
  selectedCategory,
  setSelectedCategory,
  selectedTime,
  setSelectedTime,
  openEvent,
  openCreator,
  openMap,
  savedEventIds,
  toggleEventSave,
  openNotifications,
  openEditorial,
  openCity,
}: {
  selectedCategory: Category;
  setSelectedCategory: (value: Category) => void;
  selectedTime: TimeKey | null;
  setSelectedTime: (value: TimeKey | null) => void;
  openEvent: (event: CityEvent) => void;
  openCreator: (creator: Creator) => void;
  openMap: () => void;
  savedEventIds: string[];
  toggleEventSave: (event: CityEvent) => void;
  openNotifications: () => void;
  openEditorial: () => void;
  openCity: () => void;
}) {
  const [giftOnly, setGiftOnly] = useState(false);
  const featured = events[1]!;
  const filtered = events.filter((event) => {
    const categoryMatch = selectedCategory === '全部' || event.category === selectedCategory;
    const timeMatch = !selectedTime || event.dateKey === selectedTime || (selectedTime === '今天' && event.dateKey === '现在');
    const giftMatch = !giftOnly || Boolean(event.gifts?.length);
    return categoryMatch && timeMatch && giftMatch;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <BrandHeader openCity={openCity} />

      <View style={styles.locationRow}>
        <View>
          <Text style={styles.eyebrow}>你在金华</Text>
          <Text style={styles.heroTitle}>附近在闹什么？</Text>
        </View>
        <Pressable style={styles.avatarButton} accessibilityLabel="通知" onPress={openNotifications}>
          <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <Pressable style={styles.mapTeaser} onPress={openMap}>
        <MiniMap />
        <View style={styles.mapTeaserCopy}>
          <Text style={styles.mapTeaserKicker}>LIVE MAP · {events.length} 个新鲜事</Text>
          <Text style={styles.mapTeaserTitle}>一张地图，看见今天的金华</Text>
          <View style={styles.mapTeaserButton}><Text style={styles.mapTeaserButtonText}>打开实时地图</Text><Ionicons name="arrow-forward" size={15} color={colors.ink} /></View>
        </View>
      </Pressable>

      <HorizontalChips
        items={timeFilters}
        selected={selectedTime}
        onSelect={(item) => setSelectedTime(selectedTime === item ? null : item)}
        emphasizeFirst
      />
      <HorizontalChips items={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      <Pressable style={[styles.giftFilter, giftOnly && styles.giftFilterActive]} onPress={() => setGiftOnly((current) => !current)}>
        <View style={[styles.giftFilterIcon, giftOnly && styles.giftFilterIconActive]}><Ionicons name="gift" size={15} color={giftOnly ? colors.white : colors.pink} /></View>
        <View style={styles.giftFilterCopy}><Text style={[styles.giftFilterTitle, giftOnly && styles.giftFilterTitleActive]}>只看有限时礼物的活动</Text><Text style={styles.giftFilterText}>把正在发生的城市记忆带回家</Text></View>
        <Ionicons name={giftOnly ? 'checkmark-circle' : 'chevron-forward'} size={19} color={giftOnly ? colors.pink : colors.muted} />
      </Pressable>

      <SectionHeading title={selectedTime ? `${selectedTime}值得去` : '现在值得去'} subtitle={`${filtered.length} 个去处`} />
      {filtered.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
          {filtered.slice(0, 5).map((event) => (
            <FeatureEventCard
              key={event.id}
              event={event}
              saved={savedEventIds.includes(event.id)}
              open={() => openEvent(event)}
              toggleSave={() => toggleEventSave(event)}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyInline reset={() => { setSelectedCategory('全部'); setSelectedTime(null); setGiftOnly(false); }} />
      )}

      <View style={styles.nowCard}>
        <Image source={featured.image} style={styles.nowCardImage} />
        <View style={styles.nowBadge}><View style={styles.liveDot} /><Text style={styles.nowBadgeText}>正在发生</Text></View>
        <View style={styles.nowOverlay}>
          <Text style={styles.nowTitle}>{featured.title}</Text>
          <Text style={styles.nowMeta}>{featured.venue} · {featured.timeLabel}</Text>
          <Pressable style={styles.lightButton} onPress={() => openEvent(featured)}><Text style={styles.lightButtonText}>现在过去</Text></Pressable>
        </View>
      </View>

      <SectionHeading title="遇见本地创作者" subtitle="他们最近出现在哪里" />
      <View style={styles.creatorGrid}>
        {creators.map((creator) => (
          <CreatorTile key={creator.id} creator={creator} open={() => openCreator(creator)} />
        ))}
      </View>

      <Pressable style={styles.editorialCard} onPress={openEditorial} accessibilityLabel="阅读闹闹城市小报">
        <Text style={styles.editorialKicker}>闹闹城市小报 01</Text>
        <Text style={styles.editorialTitle}>没有店铺的人，{`\n`}如何在城市里被找到？</Text>
        <Text style={styles.editorialBody}>跟着三位移动创作者，从古子城的夜市一路逛到湖边音乐会。</Text>
        <View style={styles.editorialLink}><Text style={styles.editorialLinkText}>读 3 分钟</Text><Ionicons name="arrow-forward" size={16} color={colors.cream} /></View>
      </Pressable>
    </ScrollView>
  );
}

function MapScreen({
  events: visibleEvents,
  savedEventIds,
  savedCreatorIds,
  query,
  setQuery,
  selectedCategory,
  setSelectedCategory,
  selectedTime,
  setSelectedTime,
  layer,
  setLayer,
  zoom,
  setZoom,
  openEvent,
  openCreator,
  openCity,
  openFilter,
}: {
  events: CityEvent[];
  savedEventIds: string[];
  savedCreatorIds: string[];
  query: string;
  setQuery: (value: string) => void;
  selectedCategory: Category;
  setSelectedCategory: (value: Category) => void;
  selectedTime: TimeKey | null;
  setSelectedTime: (value: TimeKey | null) => void;
  layer: MapLayer;
  setLayer: (layer: MapLayer) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  openEvent: (event: CityEvent) => void;
  openCreator: (creator: Creator) => void;
  openCity: () => void;
  openFilter: () => void;
}) {
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusedCreatorId, setFocusedCreatorId] = useState<string | null>(null);
  const [realMapReady, setRealMapReady] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const focusedEvent = visibleEvents.find((event) => event.id === focusedEventId) ?? visibleEvents[0];
  const canLoadRealMap = Platform.OS === 'web' && Boolean(process.env.EXPO_PUBLIC_AMAP_WEB_KEY && process.env.EXPO_PUBLIC_AMAP_SECURITY_JS_CODE);

  return (
    <View style={styles.mapScreen}>
      <View style={styles.mapTopArea}>
        <View style={styles.mapTitleRow}>
          <View><Text style={styles.eyebrow}>LIVE MAP</Text><Text style={styles.mapPageTitle}>金华 · 正在发生</Text></View>
          <Pressable style={styles.cityButton} onPress={openCity}><Text style={styles.cityButtonText}>金华</Text><Ionicons name="chevron-down" size={14} color={colors.ink} /></Pressable>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="搜活动、地点或兴趣" placeholderTextColor="#989389" style={styles.searchInput} />
          {query ? <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
        </View>
        <View style={styles.layerRow}>
          {(['活动', '创作者'] as MapLayer[]).map((item) => (
            <Pressable key={item} style={[styles.layerButton, layer === item && styles.layerButtonActive]} onPress={() => setLayer(item)}>
              <Ionicons name={item === '活动' ? 'sparkles' : 'color-palette'} size={15} color={layer === item ? colors.white : colors.ink} />
              <Text style={[styles.layerButtonText, layer === item && styles.layerButtonTextActive]}>{item}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.layerButton, (selectedTime || selectedCategory !== '全部') && styles.filterActive]} onPress={openFilter}>
            <Ionicons name="options" size={15} color={colors.ink} />
            <Text style={styles.layerButtonText}>{selectedTime ?? (selectedCategory !== '全部' ? selectedCategory : '筛选')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapCanvas}>
        {!realMapReady ? <MapArtwork zoom={zoom / 12} /> : null}
        {canLoadRealMap ? <AMapCanvas events={visibleEvents} layer={layer} focusedEventId={focusedEvent?.id ?? null} focusedCreatorId={focusedCreatorId} savedEventIds={savedEventIds} savedCreatorIds={savedCreatorIds} zoom={zoom} recenterSignal={recenterSignal} focusEvent={setFocusedEventId} focusCreator={setFocusedCreatorId} openCreator={openCreator} ready={() => setRealMapReady(true)} /> : null}
        {!realMapReady && (layer === '活动' ? visibleEvents.map((event) => (
          <MapPin
            key={event.id}
            x={event.mapX}
            y={event.mapY}
            emoji={eventMapEmoji[event.id] ?? '✨'}
            color={event.accent}
            title={event.title}
            hasGift={Boolean(event.gifts?.length)}
            saved={savedEventIds.includes(event.id)}
            active={focusedEvent?.id === event.id}
            onPress={() => setFocusedEventId(event.id)}
          />
        )) : creators.map((creator) => {
          const position = creatorMapPosition[creator.id]!;
          return <CreatorPin key={creator.id} creator={creator} x={position.x} y={position.y} saved={savedCreatorIds.includes(creator.id)} onPress={() => openCreator(creator)} />;
        }))}
        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomButton} onPress={() => setZoom(Math.min(18, zoom + 1))}><Ionicons name="add" size={20} color={colors.ink} /></Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomButton} onPress={() => setZoom(Math.max(9, zoom - 1))}><Ionicons name="remove" size={20} color={colors.ink} /></Pressable>
        </View>
        <Pressable style={styles.locateButton} onPress={() => setRecenterSignal((value) => value + 1)}><Ionicons name="locate" size={21} color={realMapReady ? colors.orange : colors.blue} /></Pressable>
        <View style={styles.demoMapLabel}><Ionicons name={realMapReady ? 'map-outline' : 'flask-outline'} size={12} color={realMapReady ? colors.green : colors.muted} /><Text style={styles.demoMapLabelText}>{realMapReady ? '高德地图 · Demo 坐标' : '地图加载中 · 原型回退'}</Text></View>
      </View>

      <View style={styles.mapResults}>
        <View style={styles.mapResultsHandle} />
        {layer === '活动' ? (
          visibleEvents.length && focusedEvent ? (
            <CompactEventCard event={focusedEvent} open={() => openEvent(focusedEvent)} />
          ) : <EmptyMap />
        ) : (
          <View style={styles.creatorResultRow}>
            <View style={styles.creatorResultHeading}><Text style={styles.creatorResultTitle}>{creators.length} 位创作者正在这座城里流动</Text><View style={styles.creatorSavedCount}><Ionicons name="bookmark" size={11} color={colors.orange} /><Text style={styles.creatorSavedCountText}>已关注 {savedCreatorIds.length}</Text></View></View>
            <Text style={styles.creatorResultText}>水滴形手艺图标代表创作者；蓝色星标表示创作者身份，橙色星标表示已收藏。</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SavedScreen({ savedEventIds, savedCreatorIds, openEvent, openCreator, explore, openCity }: {
  savedEventIds: string[];
  savedCreatorIds: string[];
  openEvent: (event: CityEvent) => void;
  openCreator: (creator: Creator) => void;
  explore: () => void;
  openCity: () => void;
}) {
  const savedEvents = events.filter((event) => savedEventIds.includes(event.id));
  const savedCreators = creators.filter((creator) => savedCreatorIds.includes(creator.id));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <BrandHeader openCity={openCity} />
      <Text style={styles.pageTitle}>我的收藏</Text>
      <Text style={styles.pageSubtitle}>想去的现场、想认识的人，都先放在这里。</Text>

      <View style={styles.savedStats}>
        <View style={styles.savedStat}><Text style={styles.savedStatNumber}>{savedEvents.length}</Text><Text style={styles.savedStatLabel}>想去</Text></View>
        <View style={styles.savedStatLine} />
        <View style={styles.savedStat}><Text style={styles.savedStatNumber}>{savedCreators.length}</Text><Text style={styles.savedStatLabel}>关注创作者</Text></View>
        <View style={styles.savedStatLine} />
        <View style={styles.savedStat}><Text style={styles.savedStatNumber}>1</Text><Text style={styles.savedStatLabel}>点亮城市</Text></View>
      </View>

      <SectionHeading title="即将发生" subtitle="按时间排列" />
      {savedEvents.length ? savedEvents.map((event) => <ListEventCard key={event.id} event={event} open={() => openEvent(event)} />) : <EmptySaved explore={explore} />}

      <SectionHeading title="关注的创作者" subtitle="新作品和出摊提醒" />
      {savedCreators.map((creator) => <CreatorListRow key={creator.id} creator={creator} open={() => openCreator(creator)} />)}
    </ScrollView>
  );
}

function ProfileScreen({ isLoggedIn, openAuth, openJoin, openUtility }: { isLoggedIn: boolean; openAuth: () => void; openJoin: (kind: JoinKind) => void; openUtility: (kind: UtilityKind) => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <BrandHeader openCity={() => openUtility('city')} />
      <View style={styles.profileHero}>
        <Image source={require('./assets/icon.png')} style={styles.profileMascot} />
        <Text style={styles.profileGreeting}>{isLoggedIn ? '嗨，小闹友，今天去哪儿？' : '嗨，今天想去哪里闹闹？'}</Text>
        <Text style={styles.profileCaption}>{isLoggedIn ? 'Demo 账号已登录，收藏和提醒会显示为已同步状态。' : '登录后可同步收藏、接收活动变更和到场提醒。'}</Text>
        <Pressable style={[styles.primaryButton, isLoggedIn && styles.accountLoggedButton]} onPress={openAuth}><Text style={styles.primaryButtonText}>{isLoggedIn ? '查看账号与权益' : '登录 / 注册'}</Text></Pressable>
      </View>

      <SectionHeading title="把你的现场带进来" subtitle="Demo 可完整体验提交入口" />
      <Pressable style={styles.joinCard} onPress={() => openJoin('organizer')}>
        <View style={[styles.joinIcon, { backgroundColor: '#DDE6FF' }]}><Ionicons name="calendar" size={24} color={colors.blue} /></View>
        <View style={styles.joinCardCopy}><Text style={styles.joinCardTitle}>我是活动主办方</Text><Text style={styles.joinCardBody}>发布活动、管理场次与临时变更</Text></View>
        <Ionicons name="chevron-forward" size={19} color={colors.muted} />
      </Pressable>
      <Pressable style={styles.joinCard} onPress={() => openJoin('creator')}>
        <View style={[styles.joinIcon, { backgroundColor: '#F8DAD1' }]}><Ionicons name="color-palette" size={24} color={colors.orangeDeep} /></View>
        <View style={styles.joinCardCopy}><Text style={styles.joinCardTitle}>我是创作者 / 手艺人</Text><Text style={styles.joinCardBody}>建立主页，标记作品出现在哪里</Text></View>
        <Ionicons name="chevron-forward" size={19} color={colors.muted} />
      </Pressable>

      <SectionHeading title="更多" />
      <Pressable onPress={() => openUtility('reminders')}><SettingsRow icon="notifications-outline" label="提醒设置" value="活动前 2 小时" /></Pressable>
      <Pressable onPress={() => openUtility('city')}><SettingsRow icon="location-outline" label="城市与定位" value="金华" /></Pressable>
      <Pressable onPress={() => openUtility('verification')}><SettingsRow icon="shield-checkmark-outline" label="数据来源与核验说明" /></Pressable>
      <Pressable onPress={() => openUtility('feedback')}><SettingsRow icon="chatbubble-ellipses-outline" label="提交建议" /></Pressable>
      <Pressable onPress={() => openUtility('about')}><SettingsRow icon="information-circle-outline" label="关于 NowNow" value="V0.1 Demo" /></Pressable>
      <Text style={styles.demoDisclaimer}>当前所有活动、创作者及作品数据均为功能测试而虚构。真实上线前必须经来源核验与授权。</Text>
    </ScrollView>
  );
}

function BrandHeader({ openCity }: { openCity?: () => void }) {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandLockup}>
        <Image source={require('./assets/icon.png')} style={styles.brandIcon} />
        <View><Text style={styles.brandName}>NowNow</Text><Text style={styles.brandChinese}>闹闹</Text></View>
      </View>
      <Pressable style={styles.jinhuaPill} onPress={openCity}><Ionicons name="location" size={13} color={colors.orange} /><Text style={styles.jinhuaPillText}>金华</Text></Pressable>
    </View>
  );
}

function BottomNav({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const items: { key: TabKey; label: string; icon: string; activeIcon: string }[] = [
    { key: 'discover', label: '发现', icon: 'sparkles-outline', activeIcon: 'sparkles' },
    { key: 'map', label: '地图', icon: 'map-outline', activeIcon: 'map' },
    { key: 'saved', label: '收藏', icon: 'bookmark-outline', activeIcon: 'bookmark' },
    { key: 'profile', label: '我的', icon: 'person-outline', activeIcon: 'person' },
  ];
  return (
    <SafeAreaView style={styles.bottomNav} edges={['bottom']}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable key={item.key} style={styles.bottomNavItem} onPress={() => onChange(item.key)}>
            <View style={[styles.navIconWrap, selected && styles.navIconWrapActive]}>
              <Ionicons name={(selected ? item.activeIcon : item.icon) as never} size={20} color={selected ? colors.orange : colors.muted} />
            </View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

function AssistantFab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.assistantFab} onPress={onPress} accessibilityLabel="打开闹闹 AI 助手">
      <View style={styles.assistantFabBubble}>
        <Image source={require('./assets/nownow-mascot.png')} style={styles.assistantFabMascot} resizeMode="contain" />
        <View style={styles.assistantFabAiBadge}><Text style={styles.assistantFabAiText}>AI</Text></View>
      </View>
      <View style={styles.assistantFabCopy}><Text style={styles.assistantFabTitle}>问闹闹</Text><Text style={styles.assistantFabSubtitle}>AI 助手</Text></View>
    </Pressable>
  );
}

function AssistantModal({ visible, close, openEvent }: { visible: boolean; close: () => void; openEvent: (event: CityEvent) => void }) {
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [reply, setReply] = useState<ReturnType<typeof getAssistantResponse> | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const ask = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    setReply(getAssistantResponse(trimmed));
    setInput('');
  };

  const resultEvents = reply ? reply.eventIds.map((id) => events.find((event) => event.id === id)).filter((event): event is CityEvent => Boolean(event)) : [];
  const giftEvent = events.find((event) => event.id === 'e-wta')!;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
        <View style={styles.modalStage}>
          <SafeAreaView style={styles.assistantPage} edges={['top', 'bottom']}>
            <View style={styles.assistantHeader}>
              <Pressable style={styles.assistantBack} onPress={close} accessibilityLabel="关闭 AI 助手"><Ionicons name="chevron-back" size={23} color={colors.ink} /></Pressable>
              <View style={styles.assistantHeaderAvatar}><Image source={require('./assets/nownow-mascot.png')} style={styles.assistantHeaderMascot} resizeMode="contain" /><View style={styles.assistantOnlineDot} /></View>
              <View style={styles.assistantHeaderCopy}><View style={styles.assistantTitleRow}><Text style={styles.assistantHeaderTitle}>问问闹闹</Text><View style={styles.assistantHeaderAi}><Text style={styles.assistantHeaderAiText}>AI</Text></View></View><Text style={styles.assistantHeaderSubtitle}>懂活动，也懂送礼</Text></View>
              <Pressable style={styles.assistantMore} onPress={() => setMoreOpen((value) => !value)}><Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} /></Pressable>
            </View>
            {moreOpen ? <View style={styles.assistantMoreMenu}><View style={styles.assistantMenuRow}><Ionicons name="server-outline" size={17} color={colors.green} /><View><Text style={styles.assistantMenuTitle}>数据范围</Text><Text style={styles.assistantMenuText}>仅检索平台已核验内容</Text></View></View><Pressable style={styles.assistantMenuRow} onPress={() => { setQuestion(null); setReply(null); setMoreOpen(false); }}><Ionicons name="trash-outline" size={17} color={colors.orange} /><View><Text style={styles.assistantMenuTitle}>清空当前对话</Text><Text style={styles.assistantMenuText}>不会影响你的收藏</Text></View></Pressable></View> : null}

            <ScrollView style={styles.assistantChat} contentContainerStyle={styles.assistantChatContent} showsVerticalScrollIndicator={false}>
              <View style={styles.assistantDataNote}><Ionicons name="shield-checkmark" size={14} color={colors.green} /><Text style={styles.assistantDataNoteText}>基于 NowNow 已核验的本地活动与礼物数据</Text></View>
              <View style={styles.assistantMessageRow}>
                <View style={styles.assistantMiniAvatar}><Image source={require('./assets/nownow-mascot.png')} style={styles.assistantMiniMascot} resizeMode="contain" /></View>
                <View style={styles.assistantMessageBubble}><Text style={styles.assistantMessageText}>嗨，我是闹闹 👋{`\n`}告诉我时间、人数、预算或想送给谁，我会从平台内容里帮你挑。</Text></View>
              </View>

              {!question ? <>
                <Text style={styles.assistantPromptLabel}>你可以这样问我</Text>
                <View style={styles.assistantPromptGrid}>
                  {assistantPrompts.map((prompt, index) => <Pressable key={prompt} style={styles.assistantPromptCard} onPress={() => ask(prompt)}><View style={styles.assistantPromptIcon}><Ionicons name={(['moon', 'gift', 'people', 'rainy'] as const)[index]} size={17} color={colors.orange} /></View><Text style={styles.assistantPromptText}>{prompt}</Text><Ionicons name="arrow-forward" size={14} color={colors.muted} /></Pressable>)}
                </View>
              </> : null}

              {question ? <View style={styles.assistantUserRow}><View style={styles.assistantUserBubble}><Text style={styles.assistantUserText}>{question}</Text></View></View> : null}

              {reply ? <>
                <View style={styles.assistantMessageRow}>
                  <View style={styles.assistantMiniAvatar}><Image source={require('./assets/nownow-mascot.png')} style={styles.assistantMiniMascot} resizeMode="contain" /></View>
                  <View style={styles.assistantMessageBubble}><Text style={styles.assistantMessageText}>{reply.text}</Text><Text style={styles.assistantSourceText}>已检索 {resultEvents.length} 条平台内容 · 刚刚</Text></View>
                </View>
                {resultEvents.map((event) => <AssistantResultCard key={event.id} event={event} open={() => openEvent(event)} />)}
                {reply.giftFocus && giftEvent.gifts?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assistantGiftRow}>
                  {giftEvent.gifts.map((gift) => <Pressable key={gift.id} style={styles.assistantGiftCard} onPress={() => openEvent(giftEvent)}><Image source={gift.image} style={styles.assistantGiftImage} /><View style={styles.assistantGiftBody}><Text style={styles.assistantGiftBadge}>{gift.badge}</Text><Text style={styles.assistantGiftName} numberOfLines={2}>{gift.name}</Text><View style={styles.assistantGiftPriceRow}><Text style={styles.assistantGiftPrice}>{gift.price}</Text><Text style={styles.assistantGiftDeadline}>{gift.saleWindow}</Text></View></View></Pressable>)}
                </ScrollView> : null}
                <Pressable style={styles.assistantAskAgain} onPress={() => { setQuestion(null); setReply(null); }}><Ionicons name="refresh" size={15} color={colors.orange} /><Text style={styles.assistantAskAgainText}>换一个问题</Text></Pressable>
              </> : null}
            </ScrollView>

            <View style={styles.assistantComposer}>
              <View style={styles.assistantInputWrap}><TextInput value={input} onChangeText={setInput} onSubmitEditing={() => ask(input)} returnKeyType="send" placeholder="问活动、礼物或周末去哪儿…" placeholderTextColor="#9A958C" style={styles.assistantInput} /><Pressable style={[styles.assistantSend, !input.trim() && styles.assistantSendDisabled]} onPress={() => ask(input)}><Ionicons name="arrow-up" size={18} color={colors.white} /></Pressable></View>
              <Text style={styles.assistantDisclaimer}>AI 推荐仅供参考，请以活动主办方最新信息为准</Text>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function AssistantResultCard({ event, open }: { event: CityEvent; open: () => void }) {
  return (
    <Pressable style={styles.assistantResultCard} onPress={open}>
      <Image source={event.image} style={styles.assistantResultImage} />
      <View style={styles.assistantResultCopy}><View style={styles.assistantResultTop}><Text style={[styles.assistantResultCategory, { color: event.accent }]}>{event.category}</Text>{event.gifts?.length ? <Text style={styles.assistantResultGift}>🎁 有限时礼物</Text> : null}</View><Text style={styles.assistantResultTitle} numberOfLines={2}>{event.title}</Text><Text style={styles.assistantResultMeta} numberOfLines={1}>{event.dateLabel} · {event.venue}</Text><View style={styles.assistantReason}><Ionicons name="sparkles" size={11} color={colors.orange} /><Text style={styles.assistantReasonText}>闹闹推荐：时间与需求匹配</Text></View></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function HorizontalChips<T extends string>({ items, selected, onSelect, emphasizeFirst = false }: { items: T[]; selected: T | null; onSelect: (item: T) => void; emphasizeFirst?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {items.map((item, index) => {
        const active = selected === item;
        return (
          <Pressable key={item} style={[styles.chip, active && styles.chipActive, emphasizeFirst && index === 0 && !selected && styles.chipLive]} onPress={() => onSelect(item)}>
            {emphasizeFirst && index === 0 ? <View style={[styles.chipDot, active && styles.chipDotActive]} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View>;
}

function FeatureEventCard({ event, saved, open, toggleSave }: { event: CityEvent; saved: boolean; open: () => void; toggleSave: () => void }) {
  return (
    <Pressable style={styles.featureCard} onPress={open}>
      <Image source={event.image} style={styles.featureImage} />
      <View style={[styles.categoryTag, { backgroundColor: event.accent }]}><Text style={styles.categoryTagText}>{event.category}</Text></View>
      {event.gifts?.length ? <View style={styles.giftBadge}><Ionicons name="gift" size={12} color={colors.white} /><Text style={styles.giftBadgeText}>有限时礼物</Text></View> : null}
      <Pressable style={styles.saveCircle} onPress={toggleSave}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? colors.orange : colors.ink} /></Pressable>
      <View style={styles.featureCopy}>
        <Text style={styles.featureDate}>{event.dateLabel} · {event.timeLabel}</Text>
        <Text style={styles.featureTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.featureMeta} numberOfLines={1}>{event.venue} · {event.price}</Text>
      </View>
    </Pressable>
  );
}

function ListEventCard({ event, open }: { event: CityEvent; open: () => void }) {
  return (
    <Pressable style={styles.listEventCard} onPress={open}>
      <Image source={event.image} style={styles.listEventImage} />
      <View style={styles.listEventCopy}>
        <Text style={[styles.listEventDate, { color: event.accent }]}>{event.dateLabel} · {event.timeLabel}</Text>
        <Text style={styles.listEventTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.listEventMeta} numberOfLines={1}>{event.venue}</Text>
        {event.gifts?.length ? <Text style={styles.listGiftMeta}>🎁 {event.gifts.length} 件活动限定礼物</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

function CompactEventCard({ event, open }: { event: CityEvent; open: () => void }) {
  return (
    <Pressable style={styles.compactCard} onPress={open}>
      <Image source={event.image} style={styles.compactImage} />
      <View style={styles.compactCopy}>
        <Text style={[styles.compactDate, { color: event.accent }]}>{event.dateLabel} · {event.timeLabel}</Text>
        <Text style={styles.compactTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.compactMeta} numberOfLines={1}>{event.venue} · {event.price}</Text>
        {event.gifts?.length ? <Text style={styles.compactGiftMeta}>🎁 现场有限定礼物</Text> : null}
      </View>
      <Ionicons name="arrow-forward-circle" size={26} color={colors.orange} />
    </Pressable>
  );
}

function CreatorTile({ creator, open }: { creator: Creator; open: () => void }) {
  return (
    <Pressable style={styles.creatorTile} onPress={open}>
      <Image source={creator.image} style={styles.creatorTileImage} />
      <View style={styles.creatorTileOverlay} />
      <View style={styles.creatorTileCopy}>
        <View style={styles.creatorNameRow}><Text style={styles.creatorTileName}>{creator.name}</Text>{creator.verified ? <Ionicons name="checkmark-circle" size={14} color="#7DA9FF" /> : null}</View>
        <Text style={styles.creatorTileCraft}>{creator.craft}</Text>
      </View>
    </Pressable>
  );
}

function CreatorListRow({ creator, open }: { creator: Creator; open: () => void }) {
  return (
    <Pressable style={styles.creatorListRow} onPress={open}>
      <Image source={creator.image} style={styles.creatorListImage} />
      <View style={styles.creatorListCopy}><View style={styles.creatorNameRow}><Text style={styles.creatorListName}>{creator.name}</Text>{creator.verified ? <Ionicons name="checkmark-circle" size={14} color={colors.blue} /> : null}</View><Text style={styles.creatorListCraft}>{creator.craft}</Text><Text style={styles.creatorListUpdate}>本周有新出现地点</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function MiniMap() {
  return (
    <View style={styles.miniMap}>
      <View style={[styles.miniRoad, { width: 210, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.miniRoad, { width: 160, left: 95, top: 64, transform: [{ rotate: '65deg' }] }]} />
      <View style={[styles.miniRiver, { transform: [{ rotate: '7deg' }] }]} />
      <View style={[styles.miniPin, { left: 34, top: 55, backgroundColor: colors.orange }]}><Text style={styles.miniPinText}>♫</Text></View>
      <View style={[styles.miniPin, { left: 132, top: 25, backgroundColor: colors.blue }]}><Text style={styles.miniPinText}>集</Text></View>
      <View style={[styles.miniPin, { left: 212, top: 72, backgroundColor: colors.green }]}><Text style={styles.miniPinText}>作</Text></View>
    </View>
  );
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
}

function AMapCanvas({ events: mapEvents, layer, focusedEventId, focusedCreatorId, savedEventIds, savedCreatorIds, zoom, recenterSignal, focusEvent, focusCreator, openCreator, ready }: {
  events: CityEvent[];
  layer: MapLayer;
  focusedEventId: string | null;
  focusedCreatorId: string | null;
  savedEventIds: string[];
  savedCreatorIds: string[];
  zoom: number;
  recenterSignal: number;
  focusEvent: (id: string) => void;
  focusCreator: (id: string) => void;
  openCreator: (creator: Creator) => void;
  ready: () => void;
}) {
  const [mapApi, setMapApi] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const markerRefs = useRef<any[]>([]);
  const fittedLayerRef = useRef('');

  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
    const securityJsCode = process.env.EXPO_PUBLIC_AMAP_SECURITY_JS_CODE;
    if (Platform.OS !== 'web' || !key || !securityJsCode) return;
    let alive = true;
    let createdMap: any = null;
    let readyTimer: number | null = null;
    (globalThis as typeof globalThis & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = { securityJsCode };
    loadAMap({ key, version: '2.0' }).then((AMap) => {
      if (!alive) return;
      const map = new AMap.Map('nownow-amap-container', {
        center: [119.6495, 29.0932],
        zoom: 12.5,
        viewMode: '2D',
        resizeEnable: true,
        showLabel: true,
      });
      createdMap = map;
      setMapApi(AMap);
      setMapInstance(map);
      map.on('complete', () => {
        readyTimer = window.setTimeout(() => {
          if (!alive) return;
          window.dispatchEvent(new Event('resize'));
          map.setZoomAndCenter(12.5, [119.6495, 29.0932]);
          ready();
        }, 120);
      });
    }).catch(() => {
      // 保留原型地图作为无网络或鉴权失败时的可用回退。
    });
    return () => {
      alive = false;
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      if (createdMap) createdMap.destroy();
    };
  }, []);

  useEffect(() => {
    if (!mapApi || !mapInstance) return;
    if (markerRefs.current.length) mapInstance.remove(markerRefs.current);

    const markers = layer === '活动' ? mapEvents.flatMap((event) => {
      const position = eventGeoPosition[event.id];
      if (!position) return [];
      const active = event.id === focusedEventId;
      const saved = savedEventIds.includes(event.id);
      const hasGift = Boolean(event.gifts?.length);
      const labelOnLeft = position[0] > 119.675;
      const label = active ? `<div style="position:absolute;top:9px;${labelOnLeft ? 'right:62px' : 'left:62px'};max-width:154px;min-width:94px;height:34px;padding:0 13px;border-radius:999px;background:rgba(32,32,30,.96);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.26);color:white;font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeMapText(event.title)}</div>` : '';
      const gift = hasGift ? `<div style="position:absolute;left:${active ? '-2px' : '1px'};top:-5px;width:${active ? '26px' : '23px'};height:${active ? '26px' : '23px'};border-radius:50%;border:2px solid white;background:${colors.orange};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(70,31,18,.26);font-size:${active ? '13px' : '11px'};z-index:5;">🎁</div>` : '';
      const bookmark = saved ? `<div style="position:absolute;right:${active ? '-2px' : '1px'};top:-5px;width:${active ? '26px' : '23px'};height:${active ? '26px' : '23px'};border-radius:50%;border:2px solid white;background:${colors.orange};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(70,31,18,.26);color:white;font-size:${active ? '14px' : '12px'};font-weight:900;z-index:5;">★</div>` : '';
      const size = active ? 60 : 52;
      const fill = active ? '#FFF0E8' : '#FFFFFF';
      const content = `<div aria-label="${escapeMapText(event.title)}" style="position:relative;width:64px;height:74px;display:flex;justify-content:center;cursor:pointer;filter:drop-shadow(0 ${active ? '7px 7px' : '4px 5px'} rgba(76,39,22,${active ? '.30' : '.20'}));">${label}<div style="position:absolute;top:${active ? '45px' : '40px'};width:18px;height:18px;background:${fill};border-right:${active ? '5px' : '4px'} solid ${colors.orange};border-bottom:${active ? '5px' : '4px'} solid ${colors.orange};transform:rotate(45deg);border-radius:2px;box-sizing:border-box;z-index:1;"></div><div style="position:relative;z-index:2;width:${size}px;height:${size}px;border-radius:50%;border:${active ? '5px' : '4px'} solid ${colors.orange};background:${fill};display:flex;align-items:center;justify-content:center;font-size:${active ? '28px' : '23px'};box-sizing:border-box;box-shadow:${active ? '0 0 0 4px rgba(255,92,56,.18),inset 0 2px 0 rgba(255,255,255,.9)' : 'inset 0 2px 0 rgba(255,255,255,.9)'};">${eventMapEmoji[event.id] ?? '✨'}</div>${gift}${bookmark}</div>`;
      const marker = new mapApi.Marker({ map: mapInstance, position, content, offset: new mapApi.Pixel(-32, -34), zIndex: active ? 180 : 120 });
      marker.on('click', () => focusEvent(event.id));
      return [marker];
    }) : creators.flatMap((creator) => {
      const position = creatorGeoPosition[creator.id];
      if (!position) return [];
      const active = creator.id === focusedCreatorId;
      const saved = savedCreatorIds.includes(creator.id);
      const labelOnLeft = position[0] > 119.675;
      const label = active ? `<div style="position:absolute;top:9px;${labelOnLeft ? 'right:62px' : 'left:62px'};max-width:146px;min-width:90px;height:34px;padding:0 13px;border-radius:999px;background:rgba(32,32,30,.96);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.26);color:white;font-size:10px;font-weight:900;white-space:nowrap;">${escapeMapText(creator.name)}</div>` : '';
      const identity = `<div style="position:absolute;left:${active ? '-2px' : '1px'};top:-5px;width:${active ? '26px' : '23px'};height:${active ? '26px' : '23px'};border-radius:50%;border:2px solid white;background:${colors.blue};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(23,43,88,.26);color:white;font-size:${active ? '14px' : '12px'};font-weight:900;z-index:5;">✦</div>`;
      const bookmark = saved ? `<div style="position:absolute;right:${active ? '-2px' : '1px'};top:-5px;width:${active ? '26px' : '23px'};height:${active ? '26px' : '23px'};border-radius:50%;border:2px solid white;background:${colors.orange};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 7px rgba(70,31,18,.26);color:white;font-size:${active ? '14px' : '12px'};font-weight:900;z-index:5;">★</div>` : '';
      const verified = creator.verified ? `<div style="position:absolute;right:${active ? '0' : '3px'};top:${active ? '43px' : '38px'};width:19px;height:19px;border-radius:50%;border:2px solid white;background:${colors.blue};display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:900;z-index:5;">✓</div>` : '';
      const size = active ? 60 : 52;
      const fill = active ? '#FFF0E8' : '#FFFFFF';
      const content = `<div aria-label="${escapeMapText(creator.name)}" style="position:relative;width:64px;height:74px;display:flex;justify-content:center;cursor:pointer;filter:drop-shadow(0 ${active ? '7px 7px' : '4px 5px'} rgba(76,39,22,${active ? '.30' : '.20'}));">${label}<div style="position:absolute;top:${active ? '45px' : '40px'};width:18px;height:18px;background:${fill};border-right:${active ? '5px' : '4px'} solid ${colors.orange};border-bottom:${active ? '5px' : '4px'} solid ${colors.orange};transform:rotate(45deg);border-radius:2px;box-sizing:border-box;z-index:1;"></div><div style="position:relative;z-index:2;width:${size}px;height:${size}px;border-radius:50%;border:${active ? '5px' : '4px'} solid ${colors.orange};background:${fill};display:flex;align-items:center;justify-content:center;font-size:${active ? '28px' : '23px'};box-sizing:border-box;box-shadow:${active ? '0 0 0 4px rgba(255,92,56,.18),inset 0 2px 0 rgba(255,255,255,.9)' : 'inset 0 2px 0 rgba(255,255,255,.9)'};">${creatorMapEmoji[creator.id] ?? '🎨'}</div>${identity}${bookmark}${verified}</div>`;
      const marker = new mapApi.Marker({ map: mapInstance, position, content, offset: new mapApi.Pixel(-32, -34), zIndex: active ? 180 : 120 });
      marker.on('click', () => active ? openCreator(creator) : focusCreator(creator.id));
      return [marker];
    });

    markerRefs.current = markers;
    const fitKey = `${layer}:${markers.map((marker: any) => marker.getPosition()?.toString()).join('|')}`;
    if (markers.length && fittedLayerRef.current !== fitKey) {
      fittedLayerRef.current = fitKey;
      mapInstance.setFitView(markers, false, [65, 65, 90, 65], 13);
    }
  }, [focusCreator, focusEvent, focusedCreatorId, focusedEventId, layer, mapApi, mapEvents, mapInstance, openCreator, savedCreatorIds, savedEventIds]);

  useEffect(() => {
    if (mapInstance) mapInstance.setZoom(zoom);
  }, [mapInstance, zoom]);

  useEffect(() => {
    if (mapInstance && recenterSignal > 0) mapInstance.setZoomAndCenter(12.5, [119.6495, 29.0932]);
  }, [mapInstance, recenterSignal]);

  return <View nativeID="nownow-amap-container" style={styles.realMapLayer} />;
}

function MapArtwork({ zoom }: { zoom: number }) {
  return (
    <View style={[styles.mapArtwork, { transform: [{ scale: zoom }] }]}>
      <View style={[styles.mapBlock, { left: '4%', top: '5%', width: '33%', height: '25%', backgroundColor: '#E9E5D8' }]} />
      <View style={[styles.mapBlock, { left: '60%', top: '8%', width: '34%', height: '21%', backgroundColor: '#DFEAD9' }]} />
      <View style={[styles.mapBlock, { left: '10%', top: '64%', width: '35%', height: '28%', backgroundColor: '#ECE3D4' }]} />
      <View style={[styles.mapBlock, { left: '62%', top: '67%', width: '30%', height: '22%', backgroundColor: '#E1E7D8' }]} />
      <View style={[styles.road, { width: '125%', left: '-10%', top: '46%', transform: [{ rotate: '-16deg' }] }]} />
      <View style={[styles.road, { width: '105%', left: '14%', top: '44%', transform: [{ rotate: '67deg' }] }]} />
      <View style={[styles.roadMinor, { width: '90%', left: '2%', top: '25%', transform: [{ rotate: '15deg' }] }]} />
      <View style={[styles.roadMinor, { width: '70%', left: '28%', top: '70%', transform: [{ rotate: '-35deg' }] }]} />
      <View style={styles.river} />
      <Text style={[styles.mapDistrict, { left: '17%', top: '38%' }]}>婺 城 区</Text>
      <Text style={[styles.mapDistrict, { left: '72%', top: '47%' }]}>金 东 区</Text>
      <Text style={[styles.mapPlace, { left: '29%', top: '8%' }]}>双龙</Text>
      <Text style={[styles.mapPlace, { left: '50%', top: '35%' }]}>银泰天地</Text>
      <Text style={[styles.mapPlace, { left: '55%', top: '67%' }]}>古子城</Text>
    </View>
  );
}

function MapPin({ x, y, emoji, color, title, hasGift, saved, active, onPress }: { x: number; y: number; emoji: string; color: string; title: string; hasGift: boolean; saved: boolean; active: boolean; onPress: () => void }) {
  const labelOnLeft = x > 64;
  return (
    <Pressable style={[styles.mapPinAnchor, { left: `${x}%`, top: `${y}%` }, active && styles.mapPinAnchorActive]} onPress={onPress} accessibilityLabel={`${title}${hasGift ? '，有活动限定礼物' : ''}${saved ? '，已收藏' : ''}`}>
      {active ? <View style={[styles.mapPinLabel, labelOnLeft ? styles.mapPinLabelLeft : styles.mapPinLabelRight]}><Text style={styles.mapPinLabelText} numberOfLines={1}>{title}</Text></View> : null}
      <View style={[styles.mapPinBubble, active && styles.mapPinBubbleActive, active ? { borderColor: colors.orange } : { borderColor: '#D7D8D4' }]}>
        <View style={styles.mapPinHighlight} />
        <Text style={[styles.mapPinEmoji, active && styles.mapPinEmojiActive]}>{emoji}</Text>
      </View>
      {hasGift ? <View style={[styles.mapGiftSatellite, active && styles.mapGiftSatelliteActive]}><Text style={styles.mapGiftSatelliteEmoji}>🎁</Text></View> : null}
      {saved ? <View style={[styles.mapSavedSatellite, active && styles.mapSavedSatelliteActive]}><Ionicons name="bookmark" size={active ? 15 : 13} color={active ? colors.white : colors.orange} /></View> : null}
      <View style={[styles.mapThoughtDotLarge, active && styles.mapThoughtDotActive]} />
      <View style={[styles.mapThoughtDotSmall, active && styles.mapThoughtDotActive]} />
    </Pressable>
  );
}

function CreatorPin({ creator, x, y, saved, onPress }: { creator: Creator; x: number; y: number; saved: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.creatorPinAnchor, { left: `${x}%`, top: `${y}%` }]} onPress={onPress} accessibilityLabel={`${creator.name}，${creator.craft}${creator.verified ? '，已认证' : ''}${saved ? '，已收藏' : ''}`}>
      <View style={styles.creatorPinCard}>
        <Image source={creator.image} style={styles.creatorPinImage} />
        <View style={styles.creatorPinShade} />
      </View>
      <View style={styles.creatorTypeSatellite}><Ionicons name="color-palette" size={13} color={colors.white} /></View>
      {saved ? <View style={styles.creatorSavedSatellite}><Ionicons name="bookmark" size={13} color={colors.orange} /></View> : null}
      {creator.verified ? <View style={styles.creatorVerifiedSatellite}><Ionicons name="checkmark" size={10} color={colors.white} /></View> : null}
      <View style={styles.creatorPinPointer} />
    </Pressable>
  );
}

function EventDetail({ event, close, saved, toggleSave, openCreator, action }: { event: CityEvent | null; close: () => void; saved: boolean; toggleSave: () => void; openCreator: (creator: Creator) => void; action: (message: string) => void }) {
  if (!event) return null;
  const linkedCreators = creators.filter((creator) => event.creatorIds.includes(creator.id));
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
        <View style={styles.modalStage}>
          <SafeAreaView style={styles.detailPage} edges={['top', 'bottom']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
              <View style={styles.detailHero}>
                <Image source={event.image} style={styles.detailHeroImage} />
                <View style={styles.detailHeroShade} />
                <Pressable style={styles.detailClose} onPress={close}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
                <Pressable style={styles.detailSave} onPress={toggleSave}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={21} color={saved ? colors.orange : colors.ink} /></Pressable>
                <View style={styles.detailHeroCopy}><View style={[styles.detailCategory, { backgroundColor: event.accent }]}><Text style={styles.detailCategoryText}>{event.category}</Text></View><Text style={styles.detailTitle}>{event.title}</Text><Text style={styles.detailSubtitle}>{event.subtitle}</Text></View>
              </View>

              <View style={styles.detailBody}>
                <View style={styles.detailInfoCard}>
                  <DetailInfo icon="calendar-outline" label={event.dateLabel} value={event.timeLabel} />
                  <DetailInfo icon="location-outline" label={event.venue} value={`${event.address} · ${event.district}`} />
                  <DetailInfo icon="ticket-outline" label={event.price} value={event.ticketNote} last />
                </View>
                <View style={styles.tagsWrap}>{event.tags.map((tag) => <View key={tag} style={styles.detailTag}><Text style={styles.detailTagText}>{tag}</Text></View>)}</View>
                <Text style={styles.detailSectionTitle}>关于这场活动</Text>
                <Text style={styles.detailDescription}>{event.description}</Text>
                {event.accessibility ? <View style={styles.accessibilityCard}><Ionicons name="accessibility" size={20} color={colors.blue} /><View style={styles.accessibilityCopy}><Text style={styles.accessibilityTitle}>到场提示</Text><Text style={styles.accessibilityText}>{event.accessibility}</Text></View></View> : null}

                {event.gifts?.length ? <View style={styles.eventGiftsSection}>
                  <View style={styles.eventGiftsHeading}>
                    <View style={styles.eventGiftsIcon}><Ionicons name="gift" size={18} color={colors.white} /></View>
                    <View style={styles.eventGiftsHeadingCopy}><Text style={styles.eventGiftsKicker}>只在这几天出现</Text><Text style={styles.eventGiftsTitle}>把现场带回家</Text></View>
                  </View>
                  <Text style={styles.eventGiftsIntro}>本场礼物均已标明官方身份、发售期限和获取方式。</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventGiftsRow}>
                    {event.gifts.map((gift) => <EventGiftCard key={gift.id} gift={gift} action={action} />)}
                  </ScrollView>
                </View> : null}

                {linkedCreators.length ? <>
                  <Text style={styles.detailSectionTitle}>本场会遇见的创作者</Text>
                  {linkedCreators.map((creator) => <CreatorListRow key={creator.id} creator={creator} open={() => openCreator(creator)} />)}
                </> : null}

                <Text style={styles.detailSectionTitle}>主办与数据来源</Text>
                <View style={styles.sourceCard}>
                  <View style={styles.sourceIcon}><Ionicons name="shield-checkmark" size={21} color={colors.green} /></View>
                  <View style={styles.sourceCopy}><Text style={styles.sourceTitle}>{event.organizer}</Text><Text style={styles.sourceMeta}>{event.organizerType} · {event.source}</Text><Text style={styles.sourceVerified}>{event.verifiedAt}</Text></View>
                </View>
                <Text style={styles.prototypeNote}>原型说明：此活动及人物数据为功能测试而虚构。真实版本会显示原始来源链接、更新时间和纠错入口。</Text>
              </View>
            </ScrollView>
            <View style={styles.detailFooter}>
              <Pressable style={styles.detailSecondary} onPress={toggleSave}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={colors.ink} /><Text style={styles.detailSecondaryText}>{saved ? '已收藏' : '收藏'}</Text></Pressable>
              <Pressable style={styles.detailPrimary} onPress={() => action(event.price === '免费' ? '已加入日程' : 'Demo：即将跳转主办方购票页')}><Text style={styles.detailPrimaryText}>{event.price === '免费' ? '加入日程' : '查看报名'}</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function EventGiftCard({ gift, action }: { gift: EventGift; action: (message: string) => void }) {
  return (
    <Pressable style={styles.eventGiftCard} onPress={() => action(`已收藏「${gift.name}」的开售提醒`)}>
      <Image source={gift.image} style={styles.eventGiftImage} />
      <View style={styles.eventGiftBadge}><Text style={styles.eventGiftBadgeText}>{gift.badge}</Text></View>
      <View style={styles.eventGiftBody}>
        <Text style={styles.eventGiftName} numberOfLines={2}>{gift.name}</Text>
        <Text style={styles.eventGiftDescription} numberOfLines={2}>{gift.description}</Text>
        <View style={styles.eventGiftPriceRow}><Text style={styles.eventGiftPrice}>{gift.price}</Text>{gift.stockLabel ? <Text style={styles.eventGiftStock}>{gift.stockLabel}</Text> : null}</View>
        <View style={styles.eventGiftRule}><Ionicons name="time-outline" size={12} color={colors.pink} /><Text style={styles.eventGiftRuleText}>{gift.saleWindow}</Text></View>
        <Text style={styles.eventGiftMethod}>{gift.purchaseMethod} · {gift.requiresTicket ? '需门票' : '无需门票'}</Text>
        <View style={styles.eventGiftAction}><Text style={styles.eventGiftActionText}>提醒我</Text><Ionicons name="notifications-outline" size={13} color={colors.white} /></View>
      </View>
    </Pressable>
  );
}

function CreatorDetail({ creator, close, saved, toggleSave, openEvent, contact }: { creator: Creator | null; close: () => void; saved: boolean; toggleSave: () => void; openEvent: (event: CityEvent) => void; contact: () => void }) {
  if (!creator) return null;
  const creatorWorks = works.filter((work) => work.creatorId === creator.id);
  const appearances = events.filter((event) => event.creatorIds.includes(creator.id));
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
        <View style={styles.modalStage}>
          <SafeAreaView style={styles.detailPage} edges={['top', 'bottom']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
              <View style={styles.creatorHero}>
                <Image source={creator.image} style={styles.creatorHeroImage} />
                <View style={styles.creatorHeroShade} />
                <Pressable style={styles.detailClose} onPress={close}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
                <Pressable style={styles.detailSave} onPress={toggleSave}><Ionicons name={saved ? 'heart' : 'heart-outline'} size={21} color={saved ? colors.orange : colors.ink} /></Pressable>
                <View style={styles.creatorHeroCopy}>
                  <View style={styles.creatorTitleRow}><Text style={styles.creatorHeroTitle}>{creator.name}</Text>{creator.verified ? <Ionicons name="checkmark-circle" size={19} color="#8FB2FF" /> : null}</View>
                  <Text style={styles.creatorHeroCraft}>{creator.craft} · {creator.district}</Text>
                </View>
              </View>
              <View style={styles.detailBody}>
                <View style={styles.tagsWrap}>{creator.tags.map((tag) => <View key={tag} style={styles.detailTag}><Text style={styles.detailTagText}>{tag}</Text></View>)}</View>
                <Text style={styles.detailDescription}>{creator.bio}</Text>
                {creator.openStudio ? <View style={styles.openStudioCard}><View style={styles.liveDot} /><View><Text style={styles.openStudioTitle}>本周工作室开放</Text><Text style={styles.openStudioText}>周六 13:00–18:00 · 需提前预约</Text></View></View> : null}

                <Text style={styles.detailSectionTitle}>作品</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.worksRow}>
                  {creatorWorks.map((work) => <WorkCard key={work.id} work={work} />)}
                </ScrollView>

                <Text style={styles.detailSectionTitle}>最近出现在哪里</Text>
                {appearances.length ? appearances.map((event) => <ListEventCard key={event.id} event={event} open={() => openEvent(event)} />) : <Text style={styles.detailDescription}>最近没有公开活动，关注后会在有新地点时提醒你。</Text>}
                <Text style={styles.prototypeNote}>原型说明：正式版本中，创作者本人可认领主页、更新作品库存和标记当期出现地点。</Text>
              </View>
            </ScrollView>
            <View style={styles.detailFooter}>
              <Pressable style={styles.detailSecondary} onPress={toggleSave}><Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={colors.ink} /><Text style={styles.detailSecondaryText}>{saved ? '已关注' : '关注'}</Text></Pressable>
              <Pressable style={styles.detailPrimary} onPress={contact}><Text style={styles.detailPrimaryText}>联系 / 购买方式</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function WorkCard({ work }: { work: Work }) {
  return (
    <View style={styles.workCard}>
      <Image source={work.image} style={styles.workImage} />
      {work.limited ? <View style={styles.limitedBadge}><Text style={styles.limitedBadgeText}>限量</Text></View> : null}
      <Text style={styles.workName}>{work.name}</Text>
      <Text style={styles.workMaterial}>{work.material}</Text>
      <View style={styles.workPriceRow}><Text style={styles.workPrice}>{work.price}</Text>{work.customizable ? <Text style={styles.customText}>可定制</Text> : null}</View>
    </View>
  );
}

function FlowHeader({ title, close, eyebrow }: { title: string; close: () => void; eyebrow?: string }) {
  return (
    <View style={styles.flowHeader}>
      <Pressable onPress={close} style={styles.flowClose}><Ionicons name="chevron-back" size={21} color={colors.ink} /></Pressable>
      <View style={styles.flowHeaderCopy}>{eyebrow ? <Text style={styles.flowEyebrow}>{eyebrow}</Text> : null}<Text style={styles.flowHeaderTitle}>{title}</Text></View>
      <View style={styles.flowClose} />
    </View>
  );
}

function AuthModal({ visible, loggedIn, close, complete, logout }: { visible: boolean; loggedIn: boolean; close: () => void; complete: () => void; logout: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider><View style={styles.modalStage}><SafeAreaView style={styles.flowPage} edges={['top', 'bottom']}>
        <FlowHeader title={loggedIn ? '我的账号' : '欢迎来到 NowNow'} eyebrow="NOW NOW ACCOUNT" close={close} />
        {loggedIn ? (
          <ScrollView contentContainerStyle={styles.flowContent}>
            <View style={styles.accountHero}><Image source={require('./assets/icon.png')} style={styles.accountAvatar} /><View style={styles.accountOnline} /><Text style={styles.accountName}>小闹友 0825</Text><Text style={styles.accountId}>NowNow ID · NN20260825</Text></View>
            <View style={styles.accountStats}><View><Text style={styles.accountStatNumber}>6</Text><Text style={styles.accountStatLabel}>收藏</Text></View><View><Text style={styles.accountStatNumber}>3</Text><Text style={styles.accountStatLabel}>去过</Text></View><View><Text style={styles.accountStatNumber}>2</Text><Text style={styles.accountStatLabel}>礼物提醒</Text></View></View>
            <Text style={styles.flowSectionTitle}>账号权益</Text>
            <View style={styles.benefitGrid}><Benefit icon="cloud-done-outline" title="跨设备同步" body="收藏、关注和提醒自动同步" /><Benefit icon="notifications-outline" title="现场变化提醒" body="取消、售罄和时间调整不错过" /><Benefit icon="sparkles-outline" title="闹闹更懂你" body="基于兴趣优化活动推荐" /></View>
            <Pressable style={styles.outlineDangerButton} onPress={logout}><Text style={styles.outlineDangerText}>退出 Demo 账号</Text></Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <View style={styles.authMascotWrap}><Image source={require('./assets/nownow-mascot.png')} style={styles.authMascot} /><View><Text style={styles.authHello}>此刻，就在附近</Text><Text style={styles.authIntro}>登录后，把想去的现场和限时礼物都装进口袋。</Text></View></View>
            <View style={styles.authTabs}>{(['login', 'register'] as const).map((item) => <Pressable key={item} style={[styles.authTab, mode === item && styles.authTabActive]} onPress={() => setMode(item)}><Text style={[styles.authTabText, mode === item && styles.authTabTextActive]}>{item === 'login' ? '登录' : '注册'}</Text></Pressable>)}</View>
            {mode === 'register' ? <><FormLabel>怎么称呼你？</FormLabel><TextInput value={nickname} onChangeText={setNickname} placeholder="输入昵称" placeholderTextColor="#9C968B" style={styles.formInput} /></> : null}
            <FormLabel>手机号</FormLabel>
            <View style={styles.phoneInputRow}><Text style={styles.phonePrefix}>+86</Text><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="请输入手机号" placeholderTextColor="#9C968B" style={styles.phoneInput} /></View>
            <FormLabel>验证码</FormLabel>
            <View style={styles.codeRow}><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6 位验证码" placeholderTextColor="#9C968B" style={[styles.formInput, styles.codeInput]} /><Pressable style={styles.codeButton} onPress={() => setCodeSent(true)}><Text style={styles.codeButtonText}>{codeSent ? '已发送 59s' : '获取验证码'}</Text></Pressable></View>
            {mode === 'register' ? <View style={styles.authPreference}><Ionicons name="location" size={18} color={colors.orange} /><View style={styles.authPreferenceCopy}><Text style={styles.authPreferenceTitle}>常驻城市</Text><Text style={styles.authPreferenceText}>金华 · 注册后可在设置中修改</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></View> : null}
            <Pressable style={styles.authPrimary} onPress={complete}><Text style={styles.authPrimaryText}>{mode === 'login' ? '登录 NowNow' : '创建账号'}</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
            <View style={styles.authDivider}><View style={styles.authDividerLine} /><Text style={styles.authDividerText}>其他方式</Text><View style={styles.authDividerLine} /></View>
            <View style={styles.socialRow}><Pressable style={styles.socialButton} onPress={complete}><Ionicons name="chatbubble" size={20} color="#38A868" /><Text style={styles.socialText}>微信</Text></Pressable><Pressable style={styles.socialButton} onPress={complete}><Ionicons name="logo-apple" size={21} color={colors.ink} /><Text style={styles.socialText}>Apple</Text></Pressable></View>
            <Text style={styles.authAgreement}>继续即代表你同意《用户协议》和《隐私政策》。此 Demo 不会发送短信或保存账号信息。</Text>
          </ScrollView>
        )}
      </SafeAreaView></View></SafeAreaProvider>
    </Modal>
  );
}

function Benefit({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <View style={styles.benefitCard}><View style={styles.benefitIcon}><Ionicons name={icon as never} size={20} color={colors.orange} /></View><View><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitBody}>{body}</Text></View></View>;
}

function EditorialModal({ visible, close, openCreator, openEvent, action }: { visible: boolean; close: () => void; openCreator: (creator: Creator) => void; openEvent: (event: CityEvent) => void; action: (message: string) => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider><View style={styles.modalStage}><SafeAreaView style={styles.editorialPage} edges={['top', 'bottom']}>
        <FlowHeader title="闹闹城市小报" eyebrow="CITY PAPER · 01" close={close} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.articleContent}>
          <View style={styles.articleHero}><Image source={events[6]!.image} style={styles.articleHeroImage} /><View style={styles.articleHeroShade} /><View style={styles.articleHeroCopy}><Text style={styles.articleLabel}>城市观察</Text><Text style={styles.articleTitle}>没有店铺的人，{`\n`}如何在城市里被找到？</Text><Text style={styles.articleStandfirst}>跟着三位移动创作者，从古子城的夜市一路逛到湖边音乐会。</Text></View></View>
          <View style={styles.articleMeta}><View style={styles.articleAuthor}><Image source={require('./assets/icon.png')} style={styles.articleAuthorAvatar} /><View><Text style={styles.articleAuthorName}>闹闹编辑部</Text><Text style={styles.articleDate}>2026.08.05 · 阅读约 3 分钟</Text></View></View><Pressable style={styles.articleSave} onPress={() => action('已收藏这期城市小报')}><Ionicons name="bookmark-outline" size={18} color={colors.ink} /></Pressable></View>
          <Text style={styles.articleLead}>一座城市里，有一些作品并不住在橱窗里。它们跟着创作者移动，在周末市集、湖边音乐会和临时开放的工作室里短暂出现。</Text>
          <Text style={styles.articleParagraph}>下午四点，古子城的摊位刚刚撑开。苗念把植物染的旧布首饰逐件摆好；再过几个小时，她会收起桌布，带着没卖完的作品去鹿女湖参加晚风音乐会。</Text>
          <View style={styles.articleQuote}><Text style={styles.articleQuoteMark}>“</Text><Text style={styles.articleQuoteText}>我没有固定店铺，但每一次出现都和那个地方有关。找到我，也是在重新认识这座城。</Text><Text style={styles.articleQuoteBy}>— 苗念工作室</Text></View>
          <Text style={styles.flowSectionTitle}>沿着小报去认识他们</Text>
          {creators.slice(1).map((creator) => <CreatorListRow key={creator.id} creator={creator} open={() => openCreator(creator)} />)}
          <Text style={styles.articleParagraph}>这种“移动出现”也改变了活动的意义。活动不只是被消费的一段时间，而是创作者、地点与来访者临时建立联系的入口。</Text>
          <Pressable style={styles.articleEventCard} onPress={() => openEvent(events[6]!)}><Image source={events[6]!.image} style={styles.articleEventImage} /><View style={styles.articleEventCopy}><Text style={styles.articleEventKicker}>本周路线中的现场</Text><Text style={styles.articleEventTitle}>婺州夏日独立创作集</Text><Text style={styles.articleEventMeta}>周六–周日 · 古子城保宁门广场</Text></View><Ionicons name="arrow-forward" size={18} color={colors.orange} /></Pressable>
          <View style={styles.articleEnd}><Image source={require('./assets/nownow-mascot.png')} style={styles.articleEndMascot} /><Text style={styles.articleEndTitle}>下一期想看什么？</Text><Text style={styles.articleEndBody}>告诉闹闹你想认识的地方、活动或人。</Text><Pressable style={styles.articleFeedback} onPress={() => action('已记录：想参与下一期选题')}><Text style={styles.articleFeedbackText}>参与选题</Text></Pressable></View>
        </ScrollView>
      </SafeAreaView></View></SafeAreaProvider>
    </Modal>
  );
}

function FilterModal({ visible, close, selectedCategory, setSelectedCategory, selectedTime, setSelectedTime }: { visible: boolean; close: () => void; selectedCategory: Category; setSelectedCategory: (value: Category) => void; selectedTime: TimeKey | null; setSelectedTime: (value: TimeKey | null) => void }) {
  const [freeOnly, setFreeOnly] = useState(false);
  const [giftOnly, setGiftOnly] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.sheetBackdrop}><Pressable style={styles.sheetDismissArea} onPress={close} /><SafeAreaView style={styles.filterSheet} edges={['bottom']}>
        <View style={styles.sheetHandle} /><View style={styles.sheetTitleRow}><View><Text style={styles.flowEyebrow}>MAP FILTER</Text><Text style={styles.sheetTitle}>筛选地图内容</Text></View><Pressable style={styles.flowClose} onPress={close}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.filterContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.filterLabel}>什么时候</Text><View style={styles.filterChipWrap}>{timeFilters.map((item) => <Pressable key={item} style={[styles.filterChip, selectedTime === item && styles.filterChipActive]} onPress={() => setSelectedTime(selectedTime === item ? null : item)}><Text style={[styles.filterChipText, selectedTime === item && styles.filterChipTextActive]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.filterLabel}>想做什么</Text><View style={styles.filterChipWrap}>{categories.map((item) => <Pressable key={item} style={[styles.filterChip, selectedCategory === item && styles.filterChipActive]} onPress={() => setSelectedCategory(item)}><Text style={[styles.filterChipText, selectedCategory === item && styles.filterChipTextActive]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.filterLabel}>更多条件</Text><ToggleRow icon="ticket-outline" label="只看免费活动" active={freeOnly} toggle={() => setFreeOnly((value) => !value)} /><ToggleRow icon="gift-outline" label="有现场限定礼物" active={giftOnly} toggle={() => setGiftOnly((value) => !value)} />
        </ScrollView>
        <View style={styles.filterFooter}><Pressable onPress={() => { setSelectedTime(null); setSelectedCategory('全部'); setFreeOnly(false); setGiftOnly(false); }}><Text style={styles.filterReset}>全部重置</Text></Pressable><Pressable style={styles.filterApply} onPress={close}><Text style={styles.filterApplyText}>查看地图结果</Text></Pressable></View>
      </SafeAreaView></View>
    </Modal>
  );
}

function ToggleRow({ icon, label, active, toggle }: { icon: string; label: string; active: boolean; toggle: () => void }) {
  return <Pressable style={styles.toggleRow} onPress={toggle}><View style={styles.toggleIcon}><Ionicons name={icon as never} size={19} color={colors.orange} /></View><Text style={styles.toggleLabel}>{label}</Text><View style={[styles.toggleTrack, active && styles.toggleTrackActive]}><View style={[styles.toggleThumb, active && styles.toggleThumbActive]} /></View></Pressable>;
}

function UtilityModal({ kind, close, action }: { kind: UtilityKind; close: () => void; action: (message: string) => void }) {
  const [reminderA, setReminderA] = useState(true);
  const [reminderB, setReminderB] = useState(true);
  const [feedback, setFeedback] = useState('');
  if (!kind) return null;
  const config: Record<Exclude<UtilityKind, null>, { title: string; eyebrow: string }> = {
    notifications: { title: '通知中心', eyebrow: '3 条新消息' }, city: { title: '城市与定位', eyebrow: 'CURRENT CITY' }, reminders: { title: '提醒设置', eyebrow: 'NOTIFICATIONS' }, verification: { title: '数据如何被核验', eyebrow: 'TRUST & SAFETY' }, feedback: { title: '提交建议', eyebrow: 'HELP US IMPROVE' }, about: { title: '关于 NowNow', eyebrow: 'V0.1 DEMO' }, contact: { title: '联系与购买方式', eyebrow: 'CREATOR CONTACT' },
  };
  const current = config[kind];
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider><View style={styles.modalStage}><SafeAreaView style={styles.flowPage} edges={['top', 'bottom']}><FlowHeader title={current.title} eyebrow={current.eyebrow} close={close} /><ScrollView contentContainerStyle={styles.flowContent}>
        {kind === 'notifications' ? <NotificationContent action={action} /> : null}
        {kind === 'city' ? <CityContent action={action} /> : null}
        {kind === 'reminders' ? <><View style={styles.utilityLead}><Ionicons name="notifications" size={24} color={colors.orange} /><Text style={styles.utilityLeadTitle}>只在真正需要时提醒你</Text><Text style={styles.utilityLeadBody}>活动变化、开售与出发提醒可以分别控制。</Text></View><Text style={styles.flowSectionTitle}>活动提醒</Text><ToggleRow icon="time-outline" label="活动开始前 2 小时" active={reminderA} toggle={() => setReminderA((v) => !v)} /><ToggleRow icon="warning-outline" label="取消、售罄或地点变更" active={reminderB} toggle={() => setReminderB((v) => !v)} /><Text style={styles.flowSectionTitle}>免打扰</Text><View style={styles.utilityInfoCard}><Text style={styles.utilityInfoTitle}>23:00–08:00</Text><Text style={styles.utilityInfoBody}>紧急活动变更除外</Text><Ionicons name="chevron-forward" size={17} color={colors.muted} /></View></> : null}
        {kind === 'verification' ? <VerificationContent /> : null}
        {kind === 'feedback' ? <><View style={styles.utilityLead}><Ionicons name="chatbubble-ellipses" size={25} color={colors.orange} /><Text style={styles.utilityLeadTitle}>你的建议会直接进入产品清单</Text><Text style={styles.utilityLeadBody}>Demo 不会真的发送，但这里展示正式版本的反馈结构。</Text></View><Text style={styles.flowSectionTitle}>反馈类型</Text><View style={styles.filterChipWrap}>{['功能建议', '内容纠错', '体验问题', '合作咨询'].map((item, index) => <View key={item} style={[styles.filterChip, index === 0 && styles.filterChipActive]}><Text style={[styles.filterChipText, index === 0 && styles.filterChipTextActive]}>{item}</Text></View>)}</View><FormLabel>告诉我们发生了什么</FormLabel><TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="描述你的建议，也可以留下希望我们联系你的方式" placeholderTextColor="#9C968B" style={[styles.formInput, styles.feedbackInput]} /><View style={styles.uploadPlaceholder}><Ionicons name="camera-outline" size={23} color={colors.muted} /><Text style={styles.uploadTitle}>添加截图</Text><Text style={styles.uploadCaption}>最多 4 张 · Demo 不会上传</Text></View><Pressable style={styles.authPrimary} onPress={() => action('建议已提交，感谢你帮助闹闹变好')}><Text style={styles.authPrimaryText}>提交建议</Text></Pressable></> : null}
        {kind === 'about' ? <AboutContent /> : null}
        {kind === 'contact' ? <ContactContent action={action} /> : null}
      </ScrollView></SafeAreaView></View></SafeAreaProvider>
    </Modal>
  );
}

function NotificationContent({ action }: { action: (message: string) => void }) {
  const items = [
    { icon: 'alert-circle', color: colors.orange, title: '鹿女湖音乐会入场时间调整', body: '受天气影响，演出调整为 19:00 开始。', time: '10 分钟前', unread: true },
    { icon: 'gift', color: colors.pink, title: 'WTA500 限定纪念球明日开售', body: '无需门票即可进入礼物区，每日限量。', time: '1 小时前', unread: true },
    { icon: 'color-palette', color: colors.blue, title: '林间陶所发布了新作品', body: '你关注的创作者更新了「雨后青灰杯」。', time: '昨天', unread: false },
  ];
  return <><View style={styles.notificationSummary}><Text style={styles.notificationSummaryNumber}>3</Text><View><Text style={styles.notificationSummaryTitle}>今天值得留意</Text><Text style={styles.notificationSummaryBody}>2 条活动变化 · 1 条创作者动态</Text></View></View>{items.map((item) => <Pressable key={item.title} style={styles.notificationItem} onPress={() => action(`已查看：${item.title}`)}><View style={[styles.notificationIcon, { backgroundColor: `${item.color}18` }]}><Ionicons name={item.icon as never} size={21} color={item.color} /></View><View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{item.unread ? <View style={styles.notificationUnread} /> : null}</View><Text style={styles.notificationBody}>{item.body}</Text><Text style={styles.notificationTime}>{item.time}</Text></View></Pressable>)}</>;
}

function CityContent({ action }: { action: (message: string) => void }) {
  return <><View style={styles.currentCityCard}><View style={styles.currentCityIcon}><Ionicons name="navigate" size={23} color={colors.white} /></View><View style={styles.currentCityCopy}><Text style={styles.currentCityLabel}>当前定位城市</Text><Text style={styles.currentCityName}>金华</Text><Text style={styles.currentCityMeta}>浙江省 · 8 个活动正在发生</Text></View><View style={styles.currentCityBadge}><Text style={styles.currentCityBadgeText}>使用中</Text></View></View><Text style={styles.flowSectionTitle}>最近访问</Text><View style={styles.cityGrid}>{['金华', '杭州', '上海'].map((city, index) => <Pressable key={city} style={[styles.cityOption, index === 0 && styles.cityOptionActive]} onPress={() => action(index === 0 ? '已使用金华作为当前城市' : `${city}城市内容即将开放`)}><Text style={[styles.cityOptionName, index === 0 && styles.cityOptionNameActive]}>{city}</Text><Text style={styles.cityOptionCount}>{index === 0 ? '8 个现场' : '即将开放'}</Text></Pressable>)}</View><Text style={styles.flowSectionTitle}>城市服务范围</Text><View style={styles.utilityInfoCard}><Ionicons name="map-outline" size={21} color={colors.orange} /><View style={styles.utilityInfoCopy}><Text style={styles.utilityInfoTitle}>当前以金华为 Demo 城市</Text><Text style={styles.utilityInfoBody}>正式版本将根据内容密度逐城开放。</Text></View></View></>;
}

function VerificationContent() {
  const steps = [{ icon: 'document-text-outline', title: '来源记录', body: '保存主办方官网、公众号或本人提交记录。' }, { icon: 'person-outline', title: '身份核验', body: '确认主办方、场地方或创作者的发布身份。' }, { icon: 'refresh-outline', title: '动态复核', body: '活动前再次检查时间、地点、售罄与取消状态。' }, { icon: 'people-outline', title: '用户纠错', body: '现场用户可以快速报告信息变化。' }];
  return <><View style={styles.trustScore}><Ionicons name="shield-checkmark" size={29} color={colors.green} /><View><Text style={styles.trustScoreTitle}>可信信息不是一次审核</Text><Text style={styles.trustScoreBody}>而是一条持续更新的证据链。</Text></View></View><View style={styles.verifyTimeline}>{steps.map((step, index) => <View key={step.title} style={styles.verifyStep}><View style={styles.verifyRail}><View style={styles.verifyIcon}><Ionicons name={step.icon as never} size={18} color={colors.orange} /></View>{index < steps.length - 1 ? <View style={styles.verifyLine} /> : null}</View><View style={styles.verifyCopy}><Text style={styles.verifyTitle}>{step.title}</Text><Text style={styles.verifyBody}>{step.body}</Text></View></View>)}</View><Text style={styles.prototypeNote}>Demo 中所有活动与人物均为虚构数据；此页面展示真实上线后的核验机制规划。</Text></>;
}

function AboutContent() {
  return <><View style={styles.aboutHero}><Image source={require('./assets/nownow-mascot.png')} style={styles.aboutMascot} /><Text style={styles.aboutWordmark}>NowNow</Text><Text style={styles.aboutChinese}>闹 闹</Text><Text style={styles.aboutTagline}>让正在发生的城市，被更轻松地看见。</Text></View><Text style={styles.flowSectionTitle}>我们在解决什么</Text><Text style={styles.aboutParagraph}>好活动不该只藏在零散推文里，创作者也不该只有固定店铺才会被发现。NowNow 用实时地图、编辑内容和 AI 助手，把活动、限时礼物与本地创作连接起来。</Text><View style={styles.aboutValues}><Benefit icon="map-outline" title="此刻附近" body="地图优先，而不是信息流堆叠" /><Benefit icon="gift-outline" title="城市记忆" body="看见只有此刻才存在的礼物" /><Benefit icon="people-outline" title="真实连接" body="让人找到活动背后的创作者" /></View><Text style={styles.demoDisclaimer}>V0.1 产品演示 · 设计与数据仅用于概念验证</Text></>;
}

function ContactContent({ action }: { action: (message: string) => void }) {
  return <><View style={styles.contactCreator}><Image source={creators[1]!.image} style={styles.contactAvatar} /><View><Text style={styles.contactName}>林间陶所</Text><Text style={styles.contactCraft}>手捏陶 · 日用器</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.blue} /></View><View style={styles.contactNotice}><Ionicons name="shield-checkmark-outline" size={19} color={colors.green} /><Text style={styles.contactNoticeText}>平台展示经创作者确认的公开联系方式；请勿发送敏感信息。</Text></View><Text style={styles.flowSectionTitle}>选择联系目的</Text>{[{ icon: 'bag-handle-outline', title: '购买现有作品', body: '询问库存、价格和取货方式' }, { icon: 'brush-outline', title: '预约定制', body: '说明预算、尺寸和期望时间' }, { icon: 'calendar-outline', title: '预约到访工作室', body: '本周六 13:00–18:00 可预约' }].map((item) => <Pressable key={item.title} style={styles.contactOption} onPress={() => action(`Demo：已选择「${item.title}」`)}><View style={styles.contactOptionIcon}><Ionicons name={item.icon as never} size={20} color={colors.orange} /></View><View style={styles.contactOptionCopy}><Text style={styles.contactOptionTitle}>{item.title}</Text><Text style={styles.contactOptionBody}>{item.body}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>)}<Text style={styles.flowSectionTitle}>公开渠道</Text><View style={styles.publicChannel}><Ionicons name="chatbubble-outline" size={20} color="#38A868" /><View style={styles.utilityInfoCopy}><Text style={styles.utilityInfoTitle}>微信公众号 · 林间陶所</Text><Text style={styles.utilityInfoBody}>通常 1–2 个工作日回复</Text></View><Pressable style={styles.copyButton} onPress={() => action('公众号名称已复制')}><Text style={styles.copyButtonText}>复制</Text></Pressable></View></>;
}

function JoinModal({ kind, close, submit }: { kind: JoinKind; close: () => void; submit: () => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  if (!kind) return null;
  const organizer = kind === 'organizer';
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaProvider>
        <View style={styles.modalStage}>
          <SafeAreaView style={styles.joinPage} edges={['top', 'bottom']}>
            <View style={styles.joinHeader}><Pressable onPress={close} style={styles.joinClose}><Ionicons name="close" size={22} color={colors.ink} /></Pressable><Text style={styles.joinHeaderTitle}>{organizer ? '主办方入驻' : '创作者入驻'}</Text><View style={styles.joinClose} /></View>
            <ScrollView contentContainerStyle={styles.joinForm} keyboardShouldPersistTaps="handled">
              <View style={[styles.joinFormIcon, { backgroundColor: organizer ? '#DDE6FF' : '#F8DAD1' }]}><Ionicons name={organizer ? 'calendar' : 'color-palette'} size={30} color={organizer ? colors.blue : colors.orangeDeep} /></View>
              <Text style={styles.joinFormTitle}>{organizer ? '把真正有意思的现场带进来' : '让人沿着城市找到你的创作'}</Text>
              <Text style={styles.joinFormBody}>{organizer ? '提交后可以创建活动、设置场次并发布取消或售罄等状态。' : '建立创作者主页，展示作品、开放时间和你下一次出现的地点。'}</Text>
              <FormLabel>{organizer ? '组织 / 品牌名称' : '创作者 / 工作室名称'}</FormLabel>
              <TextInput value={name} onChangeText={setName} placeholder={organizer ? '例：北山弯道俱乐部' : '例：叶青竹作'} placeholderTextColor="#9C968B" style={styles.formInput} />
              <FormLabel>联系方式</FormLabel>
              <TextInput value={contact} onChangeText={setContact} placeholder="手机号、邮箱或微信" placeholderTextColor="#9C968B" style={styles.formInput} />
              <FormLabel>{organizer ? '你通常举办什么活动？' : '介绍你的创作'}</FormLabel>
              <TextInput value={description} onChangeText={setDescription} placeholder="简单说说，让编辑更快认识你" placeholderTextColor="#9C968B" style={[styles.formInput, styles.formTextArea]} multiline />
              <View style={styles.uploadPlaceholder}><Ionicons name="images-outline" size={25} color={colors.muted} /><Text style={styles.uploadTitle}>添加证明与图片</Text><Text style={styles.uploadCaption}>营业执照、社交账号或作品照片均可</Text></View>
              <Pressable style={[styles.primaryButton, (!name || !contact) && styles.primaryButtonDisabled]} onPress={submit} disabled={!name || !contact}><Text style={styles.primaryButtonText}>提交 Demo 申请</Text></Pressable>
              <Text style={styles.formPrivacy}>此页面仅演示入驻流程，不会上传或保存你的信息。</Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

function FormLabel({ children }: { children: string }) { return <Text style={styles.formLabel}>{children}</Text>; }

function DetailInfo({ icon, label, value, last = false }: { icon: string; label: string; value: string; last?: boolean }) {
  return <View style={[styles.detailInfoRow, last && styles.detailInfoRowLast]}><View style={styles.detailInfoIcon}><Ionicons name={icon as never} size={20} color={colors.orange} /></View><View style={styles.detailInfoCopy}><Text style={styles.detailInfoLabel}>{label}</Text><Text style={styles.detailInfoValue}>{value}</Text></View></View>;
}

function SettingsRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return <View style={styles.settingsRow}><Ionicons name={icon as never} size={21} color={colors.ink} /><Text style={styles.settingsLabel}>{label}</Text>{value ? <Text style={styles.settingsValue}>{value}</Text> : null}<Ionicons name="chevron-forward" size={17} color={colors.muted} /></View>;
}

function EmptyInline({ reset }: { reset: () => void }) {
  return <View style={styles.emptyInline}><Text style={styles.emptyEmoji}>👀</Text><Text style={styles.emptyTitle}>这个组合暂时没找到</Text><Text style={styles.emptyText}>换个时间或看看全部活动。</Text><Pressable onPress={reset}><Text style={styles.emptyLink}>清除筛选</Text></Pressable></View>;
}

function EmptyMap() { return <View style={styles.emptyMap}><Text style={styles.emptyTitle}>地图上暂时没有匹配结果</Text><Text style={styles.emptyText}>清除搜索词或筛选条件再看看。</Text></View>; }
function EmptySaved({ explore }: { explore: () => void }) { return <View style={styles.emptyInline}><Ionicons name="bookmark-outline" size={28} color={colors.orange} /><Text style={styles.emptyTitle}>还没有收藏现场</Text><Pressable onPress={explore}><Text style={styles.emptyLink}>去发现</Text></Pressable></View>; }

const styles = StyleSheet.create({
  splashDesktopStage: { flex: 1, backgroundColor: '#E8E5DF', alignItems: 'center' },
  splashStage: { flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3F20' },
  splashPhoneDesktop: { marginVertical: 12, borderRadius: 28, maxHeight: 900, shadowColor: '#111', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  splashGlow: { position: 'absolute', top: '20%', width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(255,239,202,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  splashMascotWrap: { position: 'absolute', top: '25%', left: '50%', width: 240, height: 240, marginLeft: -120, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  splashMascot: { width: 240, height: 240 },
  splashDust: { position: 'absolute', top: '48%', left: '50%', width: 76, height: 32, marginLeft: -145, zIndex: 1 },
  splashDustLarge: { position: 'absolute', right: 0, bottom: 2, width: 25, height: 16, borderRadius: 13, backgroundColor: 'rgba(255,244,222,0.6)' },
  splashDustMedium: { position: 'absolute', right: 29, bottom: 7, width: 16, height: 11, borderRadius: 8, backgroundColor: 'rgba(255,244,222,0.42)' },
  splashDustSmall: { position: 'absolute', right: 51, bottom: 12, width: 9, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,244,222,0.3)' },
  splashGroundShadow: { position: 'absolute', top: '51.5%', left: '50%', width: 116, height: 15, marginLeft: -58, borderRadius: radius.pill, backgroundColor: '#8E210F', zIndex: 2 },
  splashCopy: { position: 'absolute', top: '59%', alignItems: 'center', zIndex: 4 },
  splashWordmark: { fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1.6, color: colors.cream },
  splashChinese: { marginTop: 1, fontSize: 11, fontWeight: '900', letterSpacing: 5, color: colors.cream },
  splashTagline: { marginTop: 16, fontSize: 11, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,244,222,0.76)' },
  stage: { flex: 1, backgroundColor: '#E8E5DF', alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.paper, overflow: 'hidden' },
  phoneDesktop: { marginVertical: 12, borderRadius: 28, maxHeight: 900, shadowColor: '#111', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 18, paddingBottom: 118 },
  brandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, paddingBottom: 18 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 35, height: 35, borderRadius: 11 },
  brandName: { fontSize: 17, lineHeight: 18, fontWeight: '900', letterSpacing: -0.5, color: colors.ink },
  brandChinese: { fontSize: 9, lineHeight: 11, fontWeight: '700', letterSpacing: 2.2, color: colors.orange },
  jinhuaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.cream, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  jinhuaPillText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: colors.orange, textTransform: 'uppercase', marginBottom: 5 },
  heroTitle: { fontSize: 31, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, color: colors.ink },
  avatarButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 1, borderColor: colors.white },
  mapTeaser: { height: 180, borderRadius: radius.large, backgroundColor: '#DDE8D8', overflow: 'hidden', justifyContent: 'flex-end' },
  miniMap: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E8EADF' },
  miniRoad: { position: 'absolute', height: 14, backgroundColor: '#FFFDF6', top: 42, left: -5, borderWidth: 1, borderColor: '#D9D7CB' },
  miniRiver: { position: 'absolute', width: 310, height: 24, backgroundColor: '#BED8E2', top: 96, left: -18, borderRadius: 30 },
  miniPin: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  miniPinText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  mapTeaserCopy: { padding: 16, paddingTop: 42, backgroundColor: 'rgba(32,32,30,0.78)' },
  mapTeaserKicker: { fontSize: 9, color: '#FFB69F', fontWeight: '800', letterSpacing: 1.3 },
  mapTeaserTitle: { marginTop: 5, color: colors.white, fontSize: 18, fontWeight: '800' },
  mapTeaserButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  mapTeaserButtonText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  chipsRow: { gap: 8, paddingTop: 14, paddingBottom: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipLive: { borderColor: '#F3B09F', backgroundColor: '#FFF1EC' },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  chipTextActive: { color: colors.white },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  chipDotActive: { backgroundColor: '#FF9075' },
  giftFilter: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#E8D8DE', borderRadius: radius.medium, backgroundColor: '#FFF6F8', flexDirection: 'row', alignItems: 'center', gap: 10 },
  giftFilterActive: { borderColor: colors.pink, backgroundColor: '#FFF0F4' },
  giftFilterIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE4EB' },
  giftFilterIconActive: { backgroundColor: colors.pink },
  giftFilterCopy: { flex: 1 },
  giftFilterTitle: { fontSize: 12, fontWeight: '900', color: colors.ink },
  giftFilterTitleActive: { color: colors.pink },
  giftFilterText: { marginTop: 3, fontSize: 9, color: colors.muted },
  sectionHeading: { marginTop: 28, marginBottom: 13, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.ink },
  sectionSubtitle: { fontSize: 11, color: colors.muted },
  horizontalCards: { gap: 12, paddingRight: 18 },
  featureCard: { width: 230, borderRadius: radius.medium, backgroundColor: colors.white, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE5D4' },
  featureImage: { width: '100%', height: 145 },
  categoryTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  categoryTagText: { fontSize: 10, fontWeight: '800', color: colors.white },
  giftBadge: { position: 'absolute', left: 10, top: 112, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.pink },
  giftBadgeText: { fontSize: 9, fontWeight: '900', color: colors.white },
  saveCircle: { position: 'absolute', top: 9, right: 9, width: 33, height: 33, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  featureCopy: { padding: 13, paddingBottom: 15 },
  featureDate: { fontSize: 10, color: colors.orange, fontWeight: '800' },
  featureTitle: { marginTop: 5, minHeight: 43, fontSize: 17, lineHeight: 21, fontWeight: '900', color: colors.ink },
  featureMeta: { marginTop: 6, fontSize: 11, color: colors.muted },
  nowCard: { marginTop: 28, height: 260, borderRadius: radius.large, overflow: 'hidden', backgroundColor: colors.ink },
  nowCardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  nowBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.93)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  nowBadgeText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  nowOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 60, backgroundColor: 'rgba(23,23,21,0.72)' },
  nowTitle: { color: colors.white, fontSize: 23, fontWeight: '900' },
  nowMeta: { color: '#E7E1D7', fontSize: 11, marginTop: 5 },
  lightButton: { alignSelf: 'flex-start', marginTop: 12, borderRadius: radius.pill, backgroundColor: colors.cream, paddingHorizontal: 15, paddingVertical: 9 },
  lightButtonText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  creatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  creatorTile: { width: '48.5%', height: 190, borderRadius: radius.medium, overflow: 'hidden', backgroundColor: colors.ink },
  creatorTileImage: { width: '100%', height: '100%' },
  creatorTileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,18,0.24)' },
  creatorTileCopy: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  creatorTileName: { color: colors.white, fontWeight: '900', fontSize: 15 },
  creatorTileCraft: { color: '#E8E3DB', fontSize: 10, marginTop: 3 },
  editorialCard: { marginTop: 28, padding: 22, minHeight: 225, borderRadius: radius.large, backgroundColor: colors.ink },
  editorialKicker: { color: '#FF9075', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  editorialTitle: { color: colors.cream, fontSize: 24, lineHeight: 32, fontWeight: '900', marginTop: 17 },
  editorialBody: { color: '#BEB8AE', fontSize: 12, lineHeight: 19, marginTop: 13, maxWidth: 280 },
  editorialLink: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 18 },
  editorialLinkText: { color: colors.cream, fontSize: 11, fontWeight: '800' },
  pageTitle: { marginTop: 6, fontSize: 30, fontWeight: '900', letterSpacing: -1, color: colors.ink },
  pageSubtitle: { marginTop: 7, fontSize: 13, lineHeight: 20, color: colors.muted },
  savedStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 18, marginTop: 22, borderRadius: radius.medium, backgroundColor: colors.cream },
  savedStat: { alignItems: 'center', flex: 1 },
  savedStatNumber: { fontSize: 22, fontWeight: '900', color: colors.ink },
  savedStatLabel: { marginTop: 3, fontSize: 9, color: colors.muted },
  savedStatLine: { width: 1, height: 28, backgroundColor: '#DCCEB4' },
  listEventCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: '#EEE5D4', padding: 10, marginBottom: 10 },
  listEventImage: { width: 82, height: 82, borderRadius: radius.small },
  listEventCopy: { flex: 1 },
  listEventDate: { fontSize: 9, fontWeight: '800' },
  listEventTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900', color: colors.ink, marginTop: 4 },
  listEventMeta: { fontSize: 10, color: colors.muted, marginTop: 5 },
  listGiftMeta: { fontSize: 9, color: colors.pink, fontWeight: '800', marginTop: 5 },
  creatorListRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECE5D8' },
  creatorListImage: { width: 55, height: 55, borderRadius: 17 },
  creatorListCopy: { flex: 1 },
  creatorListName: { fontSize: 14, fontWeight: '900', color: colors.ink },
  creatorListCraft: { fontSize: 10, color: colors.muted, marginTop: 3 },
  creatorListUpdate: { fontSize: 9, color: colors.orange, marginTop: 4, fontWeight: '700' },
  profileHero: { padding: 23, borderRadius: radius.large, backgroundColor: colors.cream, alignItems: 'center' },
  profileMascot: { width: 86, height: 86, borderRadius: 25 },
  profileGreeting: { fontSize: 21, fontWeight: '900', color: colors.ink, marginTop: 14 },
  profileCaption: { fontSize: 11, lineHeight: 17, color: colors.muted, textAlign: 'center', marginTop: 7, maxWidth: 280 },
  primaryButton: { marginTop: 17, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primaryButtonDisabled: { opacity: 0.35 },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  joinCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#EAE1D2', backgroundColor: colors.white, borderRadius: radius.medium, marginBottom: 10 },
  joinIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  joinCardCopy: { flex: 1 },
  joinCardTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  joinCardBody: { fontSize: 10, color: colors.muted, marginTop: 4 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E9E2D5' },
  settingsLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  settingsValue: { fontSize: 10, color: colors.muted },
  demoDisclaimer: { marginTop: 22, padding: 14, borderRadius: radius.small, backgroundColor: '#F1EDE5', fontSize: 9, lineHeight: 15, color: colors.muted },
  mapScreen: { flex: 1, backgroundColor: colors.paper },
  mapTopArea: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 10, backgroundColor: colors.paper },
  mapTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapPageTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.7, color: colors.ink },
  cityButton: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.cream },
  cityButtonText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  searchBox: { height: 43, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 11 },
  searchInput: { flex: 1, height: 41, padding: 0, fontSize: 12, color: colors.ink, outlineStyle: 'none' } as never,
  layerRow: { flexDirection: 'row', gap: 7, marginTop: 9 },
  layerButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  layerButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  layerButtonText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  layerButtonTextActive: { color: colors.white },
  filterActive: { borderColor: colors.orange, backgroundColor: '#FFF0EB' },
  mapCanvas: { position: 'relative', flex: 1, minHeight: 330, overflow: 'hidden', backgroundColor: '#E8E8DE' },
  mapArtwork: { ...StyleSheet.absoluteFillObject },
  mapBlock: { position: 'absolute', borderRadius: 25 },
  road: { position: 'absolute', height: 18, backgroundColor: '#FDFBF4', borderWidth: 1, borderColor: '#D7D5CA' },
  roadMinor: { position: 'absolute', height: 8, backgroundColor: '#F8F6EF', borderWidth: 1, borderColor: '#DDDACE' },
  river: { position: 'absolute', left: '-15%', top: '57%', width: '130%', height: 33, borderRadius: 40, backgroundColor: '#BFD8E2', transform: [{ rotate: '8deg' }] },
  mapDistrict: { position: 'absolute', fontSize: 10, fontWeight: '800', letterSpacing: 2, color: '#989586' },
  mapPlace: { position: 'absolute', fontSize: 8, color: '#77746A', backgroundColor: 'rgba(255,255,255,0.65)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  mapPinAnchor: { position: 'absolute', width: 50, height: 72, marginLeft: -25, marginTop: -25, alignItems: 'center', zIndex: 3 },
  mapPinAnchorActive: { zIndex: 20 },
  mapPinBubble: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center', shadowColor: '#1B2928', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  mapPinBubbleActive: { width: 58, height: 58, borderRadius: 29, borderWidth: 4, marginTop: -5, shadowColor: colors.orangeDeep, shadowOpacity: 0.34, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 10 },
  mapPinHighlight: { position: 'absolute', left: 8, right: 8, top: 5, height: 13, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.72)' },
  mapPinEmoji: { fontSize: 23, lineHeight: 29 },
  mapPinEmojiActive: { fontSize: 29, lineHeight: 35 },
  mapGiftSatellite: { position: 'absolute', left: -9, top: -10, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.white, backgroundColor: '#D9DBD8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1B2928', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 8 },
  mapGiftSatelliteActive: { width: 30, height: 30, borderRadius: 15, left: -12, top: -13, backgroundColor: colors.orange, borderWidth: 3 },
  mapGiftSatelliteEmoji: { fontSize: 14 },
  mapSavedSatellite: { position: 'absolute', right: -9, top: -10, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', shadowColor: '#1B2928', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 8 },
  mapSavedSatelliteActive: { width: 30, height: 30, borderRadius: 15, right: -12, top: -13, borderWidth: 3, backgroundColor: colors.orange },
  mapThoughtDotLarge: { position: 'absolute', top: 48, width: 13, height: 13, borderRadius: 7, borderWidth: 3, borderColor: '#D7D8D4', backgroundColor: colors.white },
  mapThoughtDotSmall: { position: 'absolute', top: 63, width: 7, height: 7, borderRadius: 4, borderWidth: 2, borderColor: '#D7D8D4', backgroundColor: colors.white },
  mapThoughtDotActive: { borderColor: colors.orange },
  mapPinLabel: { position: 'absolute', top: 8, maxWidth: 125, minWidth: 76, height: 32, borderRadius: radius.pill, paddingHorizontal: 11, backgroundColor: 'rgba(32,32,30,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  mapPinLabelRight: { left: 58 },
  mapPinLabelLeft: { right: 58 },
  mapPinLabelText: { maxWidth: 105, fontSize: 9, fontWeight: '900', color: colors.white },
  creatorPinAnchor: { position: 'absolute', width: 52, height: 66, marginLeft: -26, marginTop: -26, alignItems: 'center', zIndex: 5 },
  creatorPinCard: { width: 50, height: 50, borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: colors.white, backgroundColor: colors.white, shadowColor: '#172B58', shadowOpacity: 0.26, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 7, zIndex: 3 },
  creatorPinImage: { width: '100%', height: '100%', borderRadius: 13 },
  creatorPinShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(36,43,60,0.08)' },
  creatorTypeSatellite: { position: 'absolute', left: -8, top: -9, width: 25, height: 25, borderRadius: 9, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: '#172B58', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 9, zIndex: 6 },
  creatorSavedSatellite: { position: 'absolute', right: -8, top: -9, width: 25, height: 25, borderRadius: 9, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', shadowColor: '#6A1A0E', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 9, zIndex: 6 },
  creatorVerifiedSatellite: { position: 'absolute', right: -5, top: 37, width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: colors.white, backgroundColor: '#5A7FE2', alignItems: 'center', justifyContent: 'center', zIndex: 7 },
  creatorPinPointer: { position: 'absolute', top: 43, width: 13, height: 13, borderRadius: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.white, backgroundColor: '#DCE5FF', transform: [{ rotate: '45deg' }], zIndex: 2 },
  realMapLayer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 1 },
  zoomControls: { position: 'absolute', right: 12, top: 12, width: 39, borderRadius: 13, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: colors.line, zIndex: 20 },
  zoomButton: { height: 38, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: colors.line },
  locateButton: { position: 'absolute', right: 12, bottom: 35, width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  demoMapLabel: { position: 'absolute', left: 10, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, zIndex: 20 },
  demoMapLabelText: { fontSize: 8, color: colors.muted, fontWeight: '700' },
  mapResults: { backgroundColor: colors.paper, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 9, borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -13 },
  mapResultsHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8D0C3', alignSelf: 'center', marginBottom: 8 },
  compactCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: '#ECE3D5' },
  compactImage: { width: 70, height: 70, borderRadius: 13 },
  compactCopy: { flex: 1 },
  compactDate: { fontSize: 8, fontWeight: '900' },
  compactTitle: { fontSize: 14, fontWeight: '900', color: colors.ink, marginTop: 4 },
  compactMeta: { fontSize: 9, color: colors.muted, marginTop: 5 },
  compactGiftMeta: { fontSize: 8, color: colors.pink, fontWeight: '800', marginTop: 4 },
  creatorResultRow: { paddingLeft: 8, paddingRight: 124, paddingBottom: 7 },
  creatorResultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  creatorResultTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: colors.ink },
  creatorResultText: { fontSize: 10, color: colors.muted, marginTop: 5 },
  creatorSavedCount: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.cream },
  creatorSavedCountText: { fontSize: 8, fontWeight: '900', color: colors.orange },
  assistantFab: { position: 'absolute', right: 14, bottom: 88, height: 58, minWidth: 118, borderRadius: radius.pill, paddingLeft: 5, paddingRight: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FF3F20', borderWidth: 2, borderColor: colors.white, shadowColor: '#6A1A0E', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 12, zIndex: 50 },
  assistantFabBubble: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F4361A', alignItems: 'center', justifyContent: 'center' },
  assistantFabMascot: { width: 43, height: 43 },
  assistantFabAiBadge: { position: 'absolute', top: -4, right: -4, minWidth: 22, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.white },
  assistantFabAiText: { fontSize: 8, fontWeight: '900', color: colors.white },
  assistantFabCopy: { paddingRight: 2 },
  assistantFabTitle: { fontSize: 12, lineHeight: 14, fontWeight: '900', color: colors.white },
  assistantFabSubtitle: { marginTop: 2, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color: '#FFD9CF' },
  bottomNav: { height: 78, flexDirection: 'row', backgroundColor: 'rgba(255,252,246,0.98)', borderTopWidth: 1, borderTopColor: '#E7DED0' },
  bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 7 },
  navIconWrap: { width: 35, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: '#FFE5DB' },
  navLabel: { fontSize: 9, color: colors.muted, marginTop: 3, fontWeight: '700' },
  navLabelActive: { color: colors.orange },
  toast: { position: 'absolute', bottom: 92, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(32,32,30,0.94)', borderRadius: radius.pill, paddingHorizontal: 15, paddingVertical: 10 },
  toastText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  assistantPage: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: '#F7F3EC' },
  assistantHeader: { height: 70, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line },
  assistantBack: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  assistantHeaderAvatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'visible', backgroundColor: '#FF3F20' },
  assistantHeaderMascot: { width: 41, height: 41 },
  assistantOnlineDot: { position: 'absolute', right: -1, bottom: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.paper, backgroundColor: '#38B46A' },
  assistantHeaderCopy: { flex: 1 },
  assistantTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assistantHeaderTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  assistantHeaderAi: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: '#E6EBFF' },
  assistantHeaderAiText: { fontSize: 8, fontWeight: '900', color: colors.blue },
  assistantHeaderSubtitle: { marginTop: 3, fontSize: 9, color: colors.muted },
  assistantMore: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  assistantMoreMenu: { position: 'absolute', right: 12, top: 60, width: 205, padding: 8, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 15, zIndex: 30 },
  assistantMenuRow: { minHeight: 54, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#F0E9DF' },
  assistantMenuTitle: { fontSize: 10, fontWeight: '900', color: colors.ink },
  assistantMenuText: { marginTop: 2, fontSize: 7, color: colors.muted },
  assistantChat: { flex: 1 },
  assistantChatContent: { padding: 15, paddingBottom: 28 },
  assistantDataNote: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#E7F1EA', marginBottom: 15 },
  assistantDataNoteText: { fontSize: 8, fontWeight: '700', color: colors.green },
  assistantMessageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 15 },
  assistantMiniAvatar: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3F20' },
  assistantMiniMascot: { width: 31, height: 31 },
  assistantMessageBubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 11, borderRadius: 17, borderTopLeftRadius: 5, backgroundColor: colors.white, borderWidth: 1, borderColor: '#EAE1D3' },
  assistantMessageText: { fontSize: 12, lineHeight: 19, color: colors.ink },
  assistantSourceText: { marginTop: 8, fontSize: 8, fontWeight: '700', color: colors.green },
  assistantPromptLabel: { marginLeft: 41, marginBottom: 9, fontSize: 10, fontWeight: '800', color: colors.muted },
  assistantPromptGrid: { marginLeft: 41, gap: 8, marginBottom: 19 },
  assistantPromptCard: { minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7DED0' },
  assistantPromptIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0EB' },
  assistantPromptText: { flex: 1, fontSize: 11, fontWeight: '800', color: colors.ink },
  assistantUserRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  assistantUserBubble: { maxWidth: '80%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17, borderBottomRightRadius: 5, backgroundColor: colors.orange },
  assistantUserText: { fontSize: 12, lineHeight: 18, color: colors.white, fontWeight: '700' },
  assistantResultCard: { marginLeft: 41, marginBottom: 9, padding: 9, minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7DED0' },
  assistantResultImage: { width: 72, height: 76, borderRadius: 13 },
  assistantResultCopy: { flex: 1 },
  assistantResultTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assistantResultCategory: { fontSize: 8, fontWeight: '900' },
  assistantResultGift: { fontSize: 8, fontWeight: '800', color: colors.pink },
  assistantResultTitle: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: '900', color: colors.ink },
  assistantResultMeta: { marginTop: 4, fontSize: 8, color: colors.muted },
  assistantReason: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  assistantReasonText: { fontSize: 8, fontWeight: '700', color: colors.orange },
  assistantGiftRow: { marginLeft: 41, gap: 9, paddingRight: 15, paddingVertical: 4, marginBottom: 10 },
  assistantGiftCard: { width: 148, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7DED0' },
  assistantGiftImage: { width: '100%', height: 90 },
  assistantGiftBody: { padding: 9 },
  assistantGiftBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: '#FBE5EB', fontSize: 7, fontWeight: '900', color: colors.pink },
  assistantGiftName: { minHeight: 31, marginTop: 6, fontSize: 11, lineHeight: 15, fontWeight: '900', color: colors.ink },
  assistantGiftPriceRow: { marginTop: 6 },
  assistantGiftPrice: { fontSize: 12, fontWeight: '900', color: colors.orange },
  assistantGiftDeadline: { marginTop: 2, fontSize: 7, color: colors.muted },
  assistantAskAgain: { alignSelf: 'center', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: '#FFF0EB' },
  assistantAskAgainText: { fontSize: 9, fontWeight: '900', color: colors.orange },
  assistantComposer: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: Platform.OS === 'web' ? 10 : 5, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line },
  assistantInputWrap: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 5, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  assistantInput: { flex: 1, height: 44, padding: 0, fontSize: 11, color: colors.ink, outlineStyle: 'none' } as never,
  assistantSend: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange },
  assistantSendDisabled: { opacity: 0.35 },
  assistantDisclaimer: { marginTop: 6, textAlign: 'center', fontSize: 7, color: colors.muted },
  modalStage: { flex: 1, alignItems: 'center', backgroundColor: '#E8E5DF' },
  detailPage: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.paper },
  detailContent: { paddingBottom: 105 },
  detailHero: { height: 330, backgroundColor: colors.ink },
  detailHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  detailHeroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,18,0.26)' },
  detailClose: { position: 'absolute', top: 12, left: 14, width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  detailSave: { position: 'absolute', top: 12, right: 14, width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  detailHeroCopy: { position: 'absolute', left: 18, right: 18, bottom: 21 },
  detailCategory: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginBottom: 10 },
  detailCategoryText: { fontSize: 10, fontWeight: '900', color: colors.white },
  detailTitle: { fontSize: 28, lineHeight: 35, fontWeight: '900', letterSpacing: -1, color: colors.white },
  detailSubtitle: { marginTop: 7, fontSize: 12, color: '#EFE9DE' },
  detailBody: { padding: 18 },
  detailInfoCard: { backgroundColor: colors.cream, borderRadius: radius.medium, paddingHorizontal: 14 },
  detailInfoRow: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#DDCFB5' },
  detailInfoRowLast: { borderBottomWidth: 0 },
  detailInfoIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  detailInfoCopy: { flex: 1 },
  detailInfoLabel: { fontSize: 13, fontWeight: '900', color: colors.ink },
  detailInfoValue: { fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 3 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  detailTag: { borderRadius: radius.pill, backgroundColor: '#F1EDE5', paddingHorizontal: 10, paddingVertical: 6 },
  detailTagText: { fontSize: 9, color: colors.ink, fontWeight: '700' },
  detailSectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 26, marginBottom: 10 },
  detailDescription: { fontSize: 13, lineHeight: 22, color: '#4D4A44' },
  accessibilityCard: { flexDirection: 'row', gap: 11, marginTop: 16, padding: 14, borderRadius: radius.medium, backgroundColor: '#E9EEFA' },
  accessibilityCopy: { flex: 1 },
  accessibilityTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  accessibilityText: { fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 3 },
  eventGiftsSection: { marginTop: 24, marginHorizontal: -18, paddingVertical: 20, paddingLeft: 18, backgroundColor: '#2A2024' },
  eventGiftsHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingRight: 18 },
  eventGiftsIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pink },
  eventGiftsHeadingCopy: { flex: 1 },
  eventGiftsKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: '#FF9EB6' },
  eventGiftsTitle: { marginTop: 2, fontSize: 20, fontWeight: '900', color: colors.white },
  eventGiftsIntro: { paddingRight: 18, marginTop: 11, fontSize: 10, lineHeight: 16, color: '#CFC2C6' },
  eventGiftsRow: { gap: 11, paddingRight: 18, paddingTop: 15 },
  eventGiftCard: { width: 190, overflow: 'hidden', borderRadius: radius.medium, backgroundColor: colors.white },
  eventGiftImage: { width: '100%', height: 118 },
  eventGiftBadge: { position: 'absolute', top: 9, left: 9, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.pink },
  eventGiftBadgeText: { fontSize: 8, fontWeight: '900', color: colors.white },
  eventGiftBody: { padding: 12 },
  eventGiftName: { minHeight: 34, fontSize: 14, lineHeight: 17, fontWeight: '900', color: colors.ink },
  eventGiftDescription: { minHeight: 30, marginTop: 5, fontSize: 9, lineHeight: 14, color: colors.muted },
  eventGiftPriceRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventGiftPrice: { fontSize: 15, fontWeight: '900', color: colors.orange },
  eventGiftStock: { fontSize: 8, fontWeight: '800', color: colors.pink },
  eventGiftRule: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventGiftRuleText: { flex: 1, fontSize: 8, fontWeight: '800', color: colors.pink },
  eventGiftMethod: { marginTop: 5, fontSize: 8, color: colors.muted },
  eventGiftAction: { marginTop: 10, height: 34, borderRadius: radius.pill, backgroundColor: colors.pink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  eventGiftActionText: { fontSize: 10, fontWeight: '900', color: colors.white },
  sourceCard: { flexDirection: 'row', gap: 11, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.medium, backgroundColor: colors.white },
  sourceIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#E0ECE5', alignItems: 'center', justifyContent: 'center' },
  sourceCopy: { flex: 1 },
  sourceTitle: { fontSize: 12, fontWeight: '900', color: colors.ink },
  sourceMeta: { fontSize: 9, color: colors.muted, marginTop: 3 },
  sourceVerified: { fontSize: 9, color: colors.green, marginTop: 5, fontWeight: '700' },
  prototypeNote: { marginTop: 18, padding: 12, borderRadius: radius.small, backgroundColor: '#F0EDE6', fontSize: 9, lineHeight: 15, color: colors.muted },
  detailFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 12, paddingBottom: Platform.OS === 'web' ? 12 : 7, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line },
  detailSecondary: { minWidth: 90, height: 49, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  detailSecondaryText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  detailPrimary: { flex: 1, height: 49, borderRadius: radius.pill, backgroundColor: colors.orange, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  detailPrimaryText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  creatorHero: { height: 310, backgroundColor: colors.ink },
  creatorHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  creatorHeroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,18,0.28)' },
  creatorHeroCopy: { position: 'absolute', left: 18, right: 18, bottom: 20 },
  creatorTitleRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  creatorHeroTitle: { fontSize: 28, fontWeight: '900', color: colors.white },
  creatorHeroCraft: { fontSize: 11, color: '#EEE7DC', marginTop: 6 },
  openStudioCard: { marginTop: 17, padding: 14, borderRadius: radius.medium, backgroundColor: '#FFF0EB', flexDirection: 'row', alignItems: 'center', gap: 10 },
  openStudioTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  openStudioText: { fontSize: 9, color: colors.muted, marginTop: 3 },
  worksRow: { gap: 11, paddingRight: 18 },
  workCard: { width: 155, paddingBottom: 12, borderWidth: 1, borderColor: '#ECE3D5', borderRadius: radius.medium, overflow: 'hidden', backgroundColor: colors.white },
  workImage: { width: '100%', height: 132 },
  limitedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.orange, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.pill },
  limitedBadgeText: { fontSize: 8, color: colors.white, fontWeight: '900' },
  workName: { fontSize: 12, fontWeight: '900', color: colors.ink, marginHorizontal: 10, marginTop: 10 },
  workMaterial: { fontSize: 8, color: colors.muted, marginHorizontal: 10, marginTop: 4 },
  workPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 10, marginTop: 8 },
  workPrice: { fontSize: 12, fontWeight: '900', color: colors.orange },
  customText: { fontSize: 8, color: colors.green, fontWeight: '700' },
  joinPage: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.paper },
  joinHeader: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  joinClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  joinHeaderTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  joinForm: { padding: 20, paddingBottom: 40 },
  joinFormIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  joinFormTitle: { fontSize: 25, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8, color: colors.ink, marginTop: 18 },
  joinFormBody: { fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 8, marginBottom: 10 },
  formLabel: { fontSize: 11, fontWeight: '900', color: colors.ink, marginTop: 17, marginBottom: 7 },
  formInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12, color: colors.ink, outlineStyle: 'none' } as never,
  formTextArea: { height: 95, textAlignVertical: 'top' },
  uploadPlaceholder: { marginTop: 15, height: 105, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFC3AF', borderRadius: 16, backgroundColor: '#FAF6EE', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 11, fontWeight: '800', color: colors.ink, marginTop: 7 },
  uploadCaption: { fontSize: 8, color: colors.muted, marginTop: 4 },
  formPrivacy: { textAlign: 'center', fontSize: 8, color: colors.muted, marginTop: 10 },
  accountLoggedButton: { backgroundColor: colors.green },
  flowPage: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.paper },
  flowHeader: { minHeight: 67, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  flowClose: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  flowHeaderCopy: { flex: 1, alignItems: 'center' },
  flowEyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2, color: colors.orange },
  flowHeaderTitle: { marginTop: 2, fontSize: 15, fontWeight: '900', color: colors.ink },
  flowContent: { padding: 18, paddingBottom: 42 },
  flowSectionTitle: { marginTop: 23, marginBottom: 11, fontSize: 16, fontWeight: '900', color: colors.ink },
  authContent: { padding: 20, paddingBottom: 38 },
  authMascotWrap: { flexDirection: 'row', gap: 13, alignItems: 'center', padding: 15, borderRadius: radius.medium, backgroundColor: '#FFF0E8' },
  authMascot: { width: 70, height: 70 },
  authHello: { fontSize: 18, fontWeight: '900', color: colors.ink },
  authIntro: { marginTop: 5, width: 240, fontSize: 10, lineHeight: 16, color: colors.muted },
  authTabs: { marginTop: 21, height: 43, padding: 4, flexDirection: 'row', borderRadius: radius.pill, backgroundColor: '#EEE9DF' },
  authTab: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  authTabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  authTabText: { fontSize: 11, fontWeight: '800', color: colors.muted },
  authTabTextActive: { color: colors.ink },
  phoneInputRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 14 },
  phonePrefix: { paddingHorizontal: 13, fontSize: 12, fontWeight: '900', color: colors.ink, borderRightWidth: 1, borderRightColor: colors.line },
  phoneInput: { flex: 1, height: 47, paddingHorizontal: 12, fontSize: 12, color: colors.ink, outlineStyle: 'none' } as never,
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1 },
  codeButton: { width: 112, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8', borderWidth: 1, borderColor: '#FFC4B2' },
  codeButtonText: { fontSize: 10, fontWeight: '900', color: colors.orange },
  authPreference: { marginTop: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.cream },
  authPreferenceCopy: { flex: 1 },
  authPreferenceTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  authPreferenceText: { marginTop: 3, fontSize: 8, color: colors.muted },
  authPrimary: { marginTop: 20, minHeight: 50, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.orange },
  authPrimaryText: { fontSize: 12, fontWeight: '900', color: colors.white },
  authDivider: { marginVertical: 19, flexDirection: 'row', alignItems: 'center', gap: 10 },
  authDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  authDividerText: { fontSize: 8, color: colors.muted },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialButton: { flex: 1, height: 47, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  socialText: { fontSize: 11, fontWeight: '900', color: colors.ink },
  authAgreement: { marginTop: 17, textAlign: 'center', fontSize: 8, lineHeight: 14, color: colors.muted },
  accountHero: { alignItems: 'center', paddingVertical: 14 },
  accountAvatar: { width: 86, height: 86, borderRadius: 27 },
  accountOnline: { position: 'absolute', top: 78, right: '38%', width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: colors.paper, backgroundColor: '#3AB86A' },
  accountName: { marginTop: 13, fontSize: 21, fontWeight: '900', color: colors.ink },
  accountId: { marginTop: 4, fontSize: 9, color: colors.muted },
  accountStats: { marginTop: 10, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-around', borderRadius: radius.medium, backgroundColor: colors.cream },
  accountStatNumber: { textAlign: 'center', fontSize: 20, fontWeight: '900', color: colors.orange },
  accountStatLabel: { marginTop: 3, fontSize: 8, color: colors.muted },
  benefitGrid: { gap: 9 },
  benefitCard: { minHeight: 70, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  benefitIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8' },
  benefitTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  benefitBody: { marginTop: 3, fontSize: 8, color: colors.muted },
  outlineDangerButton: { marginTop: 28, height: 47, borderRadius: radius.pill, borderWidth: 1, borderColor: '#E7B9B0', alignItems: 'center', justifyContent: 'center' },
  outlineDangerText: { fontSize: 10, fontWeight: '900', color: colors.orangeDeep },
  editorialPage: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: '#F8F4ED' },
  articleContent: { paddingBottom: 45 },
  articleHero: { height: 410, backgroundColor: colors.ink },
  articleHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  articleHeroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,18,16,.48)' },
  articleHeroCopy: { position: 'absolute', left: 21, right: 21, bottom: 25 },
  articleLabel: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.orange, color: colors.white, fontSize: 8, fontWeight: '900' },
  articleTitle: { marginTop: 12, fontSize: 31, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, color: colors.white },
  articleStandfirst: { marginTop: 11, fontSize: 11, lineHeight: 18, color: '#EEE7DA' },
  articleMeta: { marginHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  articleAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  articleAuthorAvatar: { width: 36, height: 36, borderRadius: 12 },
  articleAuthorName: { fontSize: 10, fontWeight: '900', color: colors.ink },
  articleDate: { marginTop: 3, fontSize: 8, color: colors.muted },
  articleSave: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  articleLead: { margin: 21, marginBottom: 8, fontSize: 16, lineHeight: 27, fontWeight: '800', color: colors.ink },
  articleParagraph: { marginHorizontal: 21, marginTop: 14, fontSize: 12, lineHeight: 23, color: '#4F4C46' },
  articleQuote: { margin: 21, padding: 19, borderRadius: radius.medium, backgroundColor: colors.ink },
  articleQuoteMark: { fontSize: 35, lineHeight: 29, color: colors.orange },
  articleQuoteText: { fontSize: 14, lineHeight: 23, fontWeight: '800', color: colors.white },
  articleQuoteBy: { marginTop: 11, fontSize: 9, color: '#BFB8AD' },
  articleEventCard: { margin: 18, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  articleEventImage: { width: 72, height: 72, borderRadius: 13 },
  articleEventCopy: { flex: 1 },
  articleEventKicker: { fontSize: 8, fontWeight: '900', color: colors.orange },
  articleEventTitle: { marginTop: 4, fontSize: 12, fontWeight: '900', color: colors.ink },
  articleEventMeta: { marginTop: 4, fontSize: 8, color: colors.muted },
  articleEnd: { margin: 18, padding: 22, alignItems: 'center', borderRadius: radius.large, backgroundColor: '#FFE7DD' },
  articleEndMascot: { width: 76, height: 76 },
  articleEndTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  articleEndBody: { marginTop: 5, fontSize: 9, color: colors.muted },
  articleFeedback: { marginTop: 13, paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.orange },
  articleFeedbackText: { fontSize: 10, fontWeight: '900', color: colors.white },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,18,.32)' },
  sheetDismissArea: { flex: 1 },
  filterSheet: { maxHeight: '78%', width: '100%', maxWidth: 430, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.paper },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, marginTop: 9, alignSelf: 'center', backgroundColor: '#D7CEC1' },
  sheetTitleRow: { padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { marginTop: 3, fontSize: 21, fontWeight: '900', color: colors.ink },
  filterContent: { paddingHorizontal: 17, paddingBottom: 15 },
  filterLabel: { marginTop: 13, marginBottom: 9, fontSize: 11, fontWeight: '900', color: colors.ink },
  filterChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  filterChipActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  filterChipText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  filterChipTextActive: { color: colors.white },
  toggleRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  toggleIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8' },
  toggleLabel: { flex: 1, fontSize: 11, fontWeight: '800', color: colors.ink },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, padding: 3, backgroundColor: '#D7D3CB' },
  toggleTrackActive: { backgroundColor: colors.orange },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  toggleThumbActive: { marginLeft: 18 },
  filterFooter: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.line },
  filterReset: { paddingHorizontal: 8, fontSize: 10, fontWeight: '900', color: colors.muted },
  filterApply: { flex: 1, height: 47, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange },
  filterApplyText: { fontSize: 11, fontWeight: '900', color: colors.white },
  utilityLead: { padding: 18, alignItems: 'center', borderRadius: radius.large, backgroundColor: '#FFF0E8' },
  utilityLeadTitle: { marginTop: 9, fontSize: 17, fontWeight: '900', color: colors.ink },
  utilityLeadBody: { marginTop: 5, textAlign: 'center', fontSize: 9, lineHeight: 15, color: colors.muted },
  utilityInfoCard: { minHeight: 67, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  utilityInfoCopy: { flex: 1 },
  utilityInfoTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  utilityInfoBody: { marginTop: 3, fontSize: 8, lineHeight: 13, color: colors.muted },
  notificationSummary: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.large, backgroundColor: colors.ink },
  notificationSummaryNumber: { fontSize: 38, fontWeight: '900', color: colors.orange },
  notificationSummaryTitle: { fontSize: 14, fontWeight: '900', color: colors.white },
  notificationSummaryBody: { marginTop: 4, fontSize: 8, color: '#CFC8BD' },
  notificationItem: { paddingVertical: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  notificationIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  notificationTitle: { flex: 1, fontSize: 11, fontWeight: '900', color: colors.ink },
  notificationUnread: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  notificationBody: { marginTop: 5, fontSize: 9, lineHeight: 15, color: colors.muted },
  notificationTime: { marginTop: 6, fontSize: 8, color: '#A39C92' },
  currentCityCard: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.large, backgroundColor: colors.ink },
  currentCityIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange },
  currentCityCopy: { flex: 1 },
  currentCityLabel: { fontSize: 8, color: '#C6BFB4' },
  currentCityName: { marginTop: 2, fontSize: 20, fontWeight: '900', color: colors.white },
  currentCityMeta: { marginTop: 3, fontSize: 8, color: '#C6BFB4' },
  currentCityBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#314C46' },
  currentCityBadgeText: { fontSize: 8, fontWeight: '900', color: '#9BE0BE' },
  cityGrid: { flexDirection: 'row', gap: 9 },
  cityOption: { flex: 1, minHeight: 75, padding: 12, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  cityOptionActive: { borderColor: colors.orange, backgroundColor: '#FFF0E8' },
  cityOptionName: { fontSize: 14, fontWeight: '900', color: colors.ink },
  cityOptionNameActive: { color: colors.orange },
  cityOptionCount: { marginTop: 7, fontSize: 8, color: colors.muted },
  trustScore: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.large, backgroundColor: '#E7F2EB' },
  trustScoreTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  trustScoreBody: { marginTop: 4, fontSize: 9, color: colors.green },
  verifyTimeline: { marginTop: 22 },
  verifyStep: { minHeight: 84, flexDirection: 'row', gap: 12 },
  verifyRail: { width: 39, alignItems: 'center' },
  verifyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8' },
  verifyLine: { flex: 1, width: 2, backgroundColor: '#E8D9CE' },
  verifyCopy: { flex: 1, paddingTop: 6 },
  verifyTitle: { fontSize: 12, fontWeight: '900', color: colors.ink },
  verifyBody: { marginTop: 5, fontSize: 9, lineHeight: 15, color: colors.muted },
  feedbackInput: { height: 120, textAlignVertical: 'top' },
  aboutHero: { alignItems: 'center', paddingVertical: 15 },
  aboutMascot: { width: 110, height: 110 },
  aboutWordmark: { marginTop: 4, fontSize: 30, fontWeight: '900', letterSpacing: -1, color: colors.ink },
  aboutChinese: { marginTop: 1, fontSize: 10, fontWeight: '900', letterSpacing: 4, color: colors.orange },
  aboutTagline: { marginTop: 11, fontSize: 10, color: colors.muted },
  aboutParagraph: { fontSize: 12, lineHeight: 21, color: '#504D47' },
  aboutValues: { marginTop: 15, gap: 9 },
  contactCreator: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.large, backgroundColor: colors.ink },
  contactAvatar: { width: 58, height: 58, borderRadius: 18 },
  contactName: { fontSize: 16, fontWeight: '900', color: colors.white },
  contactCraft: { marginTop: 4, fontSize: 9, color: '#CFC8BD' },
  contactNotice: { marginTop: 12, padding: 12, flexDirection: 'row', gap: 9, borderRadius: radius.medium, backgroundColor: '#E7F2EB' },
  contactNoticeText: { flex: 1, fontSize: 8, lineHeight: 14, color: colors.green },
  contactOption: { minHeight: 72, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  contactOptionIcon: { width: 41, height: 41, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8' },
  contactOptionCopy: { flex: 1 },
  contactOptionTitle: { fontSize: 11, fontWeight: '900', color: colors.ink },
  contactOptionBody: { marginTop: 4, fontSize: 8, color: colors.muted },
  publicChannel: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  copyButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#E8F4EC' },
  copyButtonText: { fontSize: 9, fontWeight: '900', color: colors.green },
  emptyInline: { minHeight: 170, borderRadius: radius.medium, backgroundColor: '#F2EEE6', alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyMap: { paddingVertical: 14, alignItems: 'center' },
  emptyEmoji: { fontSize: 27 },
  emptyTitle: { fontSize: 13, fontWeight: '900', color: colors.ink, marginTop: 9 },
  emptyText: { fontSize: 10, color: colors.muted, marginTop: 5 },
  emptyLink: { fontSize: 10, color: colors.orange, fontWeight: '900', marginTop: 11 },
});
