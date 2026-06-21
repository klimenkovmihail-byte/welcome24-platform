// ============================================================
// SHARES — Welcome 24 internal share market
// Block placed at the top of the file so that aggregates are available
// when currentUser is initialized below.
// ============================================================

/** Quote history of the W24 share (asc by date). Set by admin in /shares panel. */
export const shareHistory: { date: string; price: number }[] = [
  { date: '2024-07-16', price: 5000 },
  { date: '2025-04-04', price: 5841 },
  { date: '2025-08-18', price: 6834 },
  { date: '2026-02-20', price: 7044 },
];

export const currentSharePrice = shareHistory[shareHistory.length - 1].price; // 7044 ₽

export type SharePacketType = 'purchase' | 'sale' | 'gift';

export interface SharePacket {
  id: number;
  date: string;
  quantity: number;
  acquiredPrice: number;  // ₽ за акцию (1 ₽ если подарок без оплаты)
  type: SharePacketType;
  note: string;
}

// Все акции получены по 5000 ₽ — стартовая котировка
export const myShares: SharePacket[] = [
  { id: 1, date: '2024-07-16', quantity: 5000, acquiredPrice: 5000, type: 'purchase', note: 'Стартовый инвестиционный пакет основателя' },
  { id: 2, date: '2025-04-04', quantity: 1560, acquiredPrice: 5000, type: 'purchase', note: 'Доп. пакет по результатам Q1 2025' },
  { id: 3, date: '2025-08-18', quantity: 1000, acquiredPrice: 5000, type: 'purchase', note: 'Доп. пакет за запуск офиса в Краснодаре' },
];

const SHARES_TOTAL = myShares.reduce((s, p) => s + p.quantity, 0);
const SHARES_COST  = myShares.reduce((s, p) => s + p.quantity * p.acquiredPrice, 0);
const SHARES_VALUE = SHARES_TOTAL * currentSharePrice;
const SHARES_GROWTH = SHARES_VALUE - SHARES_COST;
const SHARES_GROWTH_PCT = SHARES_COST > 0 ? (SHARES_GROWTH / SHARES_COST) * 100 : 0;

export const sharesSummary = {
  total: SHARES_TOTAL,
  cost: SHARES_COST,
  value: SHARES_VALUE,
  growth: SHARES_GROWTH,
  growthPct: SHARES_GROWTH_PCT,
  currentPrice: currentSharePrice,
};

// ============================================================
// Personal deals of the CEO (Михаил Клименков)
// 3 сделки в апреле по 300 000 ₽ + 2 сделки в мае по 500 000 ₽
// ============================================================
export const myDeals = [
  { id: 1, date: '2026-04-05', client: 'Морозов Игорь Викторович', type: 'вторичка',  vkd: 300000, income: 240000, commission: 80, status: 'paid' as const },
  { id: 2, date: '2026-04-14', client: 'Лебедева Наталья Петровна',  type: 'новостройка', vkd: 300000, income: 240000, commission: 80, status: 'paid' as const },
  { id: 3, date: '2026-04-23', client: 'Соловьёв Алексей Михайлович', type: 'вторичка',  vkd: 300000, income: 240000, commission: 80, status: 'paid' as const },
  { id: 4, date: '2026-05-08', client: 'Виноградов Дмитрий Сергеевич', type: 'вторичка',  vkd: 500000, income: 400000, commission: 80, status: 'paid' as const },
  { id: 5, date: '2026-05-19', client: 'Краснова Ольга Андреевна', type: 'новостройка', vkd: 500000, income: 400000, commission: 80, status: 'paid' as const },
];

// Derived aggregates (always in sync with myDeals)
const MY_TOTAL_VKD = myDeals.reduce((s, d) => s + d.vkd, 0);          // 3 137 743 ₽
const MY_TOTAL_INCOME = myDeals.reduce((s, d) => s + d.income, 0);    // 2 525 194 ₽
const MY_TOTAL_DEALS = myDeals.length;                                // 9

// Commission levels: L1 (80%) up to 2M ВКД, L2 (90%) up to 5M, L3 (95%) 5M+
const L1_MAX = 2_000_000;
const L2_MAX = 5_000_000;
const myLevel: 1 | 2 | 3 = MY_TOTAL_VKD >= L2_MAX ? 3 : MY_TOTAL_VKD >= L1_MAX ? 2 : 1;
const myCommission = myLevel === 3 ? 95 : myLevel === 2 ? 90 : 80;
const myNextCommission = myLevel === 3 ? 95 : myLevel === 2 ? 95 : 90;
const myNextThreshold = myLevel === 3 ? L2_MAX : myLevel === 2 ? L2_MAX : L1_MAX;
const myToNextLevel = Math.max(0, myNextThreshold - MY_TOTAL_VKD);

export const currentUser = {
  id: 1,
  name: 'Клименков Михаил Михайлович',
  email: 'mk@w24.agency',
  phone: '+7 (999) 123-45-67',
  avatar: '',
  city: 'Москва',
  level: myLevel,
  commission: myCommission,
  nextLevelCommission: myNextCommission,
  // Single deal stub kept for backward compatibility
  vkd: myDeals[0]?.vkd || 0,
  income: myDeals[0]?.income || 0,
  // Aggregates from myDeals
  totalVkd: MY_TOTAL_VKD,
  totalIncome: MY_TOTAL_INCOME,
  totalDeals: MY_TOTAL_DEALS,
  deals: MY_TOTAL_DEALS,
  // Next level threshold (absolute, not delta)
  nextLevelThreshold: myNextThreshold,
  toNextLevel: myToNextLevel,
  // Shares — values come from sharesSummary (declared above)
  shares: SHARES_TOTAL,
  sharesValue: SHARES_VALUE,
  sharesGrowth: Number(SHARES_GROWTH_PCT.toFixed(1)),
  joinDate: '2024-03-15',
  specialization: ['Жилая', 'Вторичная'],
  achievements: ['first_deal', 'team_builder', 'top_earner'],
  // Личные соцсети — отображаются в профиле и (в перспективе) в публичной карточке
  socials: {
    telegram: 'mk_w24',
    telegramChannel: '@welcome24_ceo',
    instagram: 'mikhail.klimenkov',
    vk: 'klimenkov_mk',
    max: 'mk_w24',
  } as { telegram?: string; telegramChannel?: string; instagram?: string; vk?: string; max?: string; website?: string },
};

export const agentRating = [
  { id: 1, rank: 1, name: 'Кулаков Степан Владимирович', city: 'Москва', deals: 24, vkd: 8450000, income: 6760000, level: 3, change: 0, badge: 'gold' },
  { id: 2, rank: 2, name: 'Радченко Дмитрий Владимирович', city: 'Краснодар', deals: 19, vkd: 6200000, income: 4960000, level: 3, change: 1, badge: 'silver' },
  { id: 3, rank: 3, name: 'Мухин Вячеслав Александрович', city: 'Москва', deals: 17, vkd: 5800000, income: 4640000, level: 2, change: -1, badge: 'bronze' },
  { id: 4, rank: 4, name: 'Верховская Валерия Владимировна', city: 'СПб', deals: 15, vkd: 4950000, income: 3960000, level: 2, change: 2, badge: '' },
  { id: 5, rank: 5, name: 'Изотов Илья Анатольевич', city: 'Москва', deals: 13, vkd: 4200000, income: 3360000, level: 2, change: 0, badge: '' },
  { id: 6, rank: 6, name: 'Санкин Александр Александрович', city: 'Новосибирск', deals: 11, vkd: 3600000, income: 2880000, level: 2, change: -1, badge: '' },
  { id: 7, rank: 7, name: 'Ситников Андрей Николаевич', city: 'Екатеринбург', deals: 10, vkd: 3100000, income: 2480000, level: 1, change: 3, badge: '' },
  { id: 8, rank: 8, name: 'Бородина Елена Валерьевна', city: 'Казань', deals: 9, vkd: 2800000, income: 2240000, level: 1, change: 0, badge: '' },
  { id: 9, rank: 9, name: 'Михалева Полина Игоревна', city: 'Москва', deals: 8, vkd: 2400000, income: 1920000, level: 1, change: 1, badge: '' },
  { id: 10, rank: 10, name: 'Клименков Михаил Михайлович', city: 'Москва', deals: 2, vkd: 638350, income: 510680, level: 1, change: 0, badge: '', isMe: true },
];

// ============================================================
// ACADEMY — Courses, Webinar recordings, Event schedule
// ============================================================

export type CourseLevel = 'Начинающий' | 'Средний' | 'Продвинутый';
export type CourseCategory =
  | 'Продажи' | 'Психология' | 'Маркетинг' | 'Лидерство'
  | 'Переговоры' | 'МЛМ' | 'Планирование' | 'Базовый';

export interface AcademyCourse {
  id: number;
  title: string;
  description: string;
  category: CourseCategory;
  duration: string;
  lessons: number;
  progress: number;
  completed: boolean;
  rating: number;
  students: number;
  thumbnail: string;
  author: string;
  level: CourseLevel;
  tags: string[];
  lessons_list: { id: number; title: string; duration: string; completed: boolean }[];
}

export const academyCourses: AcademyCourse[] = [
  {
    id: 1,
    title: 'Основы риэлторского дела',
    description: 'Базовый курс для начинающих агентов. Юридическая база, этика, первые сделки.',
    category: 'Базовый',
    duration: '4 часа 30 мин',
    lessons: 12,
    progress: 100,
    completed: true,
    rating: 4.9,
    students: 342,
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop',
    author: 'Клименков М.М.',
    level: 'Начинающий',
    tags: ['юридические аспекты', 'первая сделка', 'клиентская база'],
    lessons_list: [
      { id: 1, title: 'Введение в профессию', duration: '15 мин', completed: true },
      { id: 2, title: 'Правовая база: ключевые законы', duration: '25 мин', completed: true },
      { id: 3, title: 'Первый контакт с клиентом', duration: '20 мин', completed: true },
    ],
  },
  {
    id: 2,
    title: 'Психология продаж в недвижимости',
    description: 'Техники убеждения, работа с возражениями, построение доверия с клиентом.',
    category: 'Продажи',
    duration: '6 часов 15 мин',
    lessons: 18,
    progress: 67,
    completed: false,
    rating: 4.8,
    students: 218,
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=225&fit=crop',
    author: 'Радченко Д.В.',
    level: 'Средний',
    tags: ['переговоры', 'возражения', 'психология'],
    lessons_list: [
      { id: 1, title: 'Типология клиентов', duration: '22 мин', completed: true },
      { id: 2, title: 'Техника активного слушания', duration: '18 мин', completed: true },
      { id: 3, title: 'Работа с возражениями', duration: '30 мин', completed: false },
    ],
  },
  {
    id: 3,
    title: 'Переговоры на миллион',
    description: 'Техника переговоров с клиентами, контрагентами, банком. Как закрывать сложные сделки.',
    category: 'Переговоры',
    duration: '6 часов',
    lessons: 16,
    progress: 30,
    completed: false,
    rating: 4.9,
    students: 156,
    thumbnail: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=225&fit=crop',
    author: 'Кулаков С.В.',
    level: 'Продвинутый',
    tags: ['переговоры', 'сделки', 'клиенты'],
    lessons_list: [
      { id: 1, title: 'Подготовка к переговорам', duration: '20 мин', completed: true },
      { id: 2, title: 'Техника BATNA', duration: '25 мин', completed: true },
      { id: 3, title: 'Управление эмоциями', duration: '30 мин', completed: false },
    ],
  },
  {
    id: 4,
    title: 'Маркетинг объектов недвижимости',
    description: 'Продвижение объектов: фото, видео, соцсети, таргетированная реклама.',
    category: 'Маркетинг',
    duration: '5 часов',
    lessons: 15,
    progress: 0,
    completed: false,
    rating: 4.7,
    students: 176,
    thumbnail: 'https://images.unsplash.com/photo-1586282391129-76a6df230234?w=400&h=225&fit=crop',
    author: 'Верховская В.В.',
    level: 'Средний',
    tags: ['SMM', 'реклама', 'фото/видео'],
    lessons_list: [
      { id: 1, title: 'Фотосъемка объектов', duration: '25 мин', completed: false },
      { id: 2, title: 'Создание продающего описания', duration: '20 мин', completed: false },
      { id: 3, title: 'Таргет в Instagram и VK', duration: '35 мин', completed: false },
    ],
  },
  {
    id: 5,
    title: 'MLM-структура Welcome 24',
    description: 'Как работает многоуровневая система дохода. Уровни команды, защищённый и растущий процент.',
    category: 'МЛМ',
    duration: '3 часа 45 мин',
    lessons: 10,
    progress: 0,
    completed: false,
    rating: 4.6,
    students: 134,
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=225&fit=crop',
    author: 'Мухин В.А.',
    level: 'Средний',
    tags: ['MLM', 'команда', 'доход'],
    lessons_list: [
      { id: 1, title: 'Маркетинговый план: 7 уровней', duration: '25 мин', completed: false },
      { id: 2, title: 'Открытие растущего процента', duration: '30 мин', completed: false },
      { id: 3, title: 'Расчёт пассивного дохода', duration: '20 мин', completed: false },
    ],
  },
  {
    id: 6,
    title: 'Построение команды агентов',
    description: 'Рекрутинг, мотивация, обучение команды. Многоуровневая система дохода W24.',
    category: 'Лидерство',
    duration: '7 часов',
    lessons: 20,
    progress: 45,
    completed: false,
    rating: 4.9,
    students: 87,
    thumbnail: 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=400&h=225&fit=crop',
    author: 'Клименков М.М.',
    level: 'Продвинутый',
    tags: ['команда', 'рекрутинг', 'лидерство'],
    lessons_list: [
      { id: 1, title: 'Как найти первого агента', duration: '25 мин', completed: true },
      { id: 2, title: 'Система обучения в команде', duration: '30 мин', completed: true },
      { id: 3, title: 'Мотивация и удержание', duration: '35 мин', completed: false },
    ],
  },
  {
    id: 7,
    title: 'Планирование на год вперёд',
    description: 'Постановка целей по SMART. Декомпозиция плана на месяцы, недели, дни. Контроль выполнения.',
    category: 'Планирование',
    duration: '4 часа',
    lessons: 12,
    progress: 0,
    completed: false,
    rating: 4.7,
    students: 78,
    thumbnail: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=225&fit=crop',
    author: 'Радченко Д.В.',
    level: 'Средний',
    tags: ['планирование', 'цели', 'SMART'],
    lessons_list: [
      { id: 1, title: 'Постановка целей по SMART', duration: '20 мин', completed: false },
      { id: 2, title: 'Декомпозиция: квартал → месяц → неделя', duration: '25 мин', completed: false },
    ],
  },
  {
    id: 8,
    title: 'Психология клиента',
    description: 'Психотипы клиентов. Триггеры и страхи при покупке жилья. Как распознать готовность к сделке.',
    category: 'Психология',
    duration: '5 часов 30 мин',
    lessons: 14,
    progress: 0,
    completed: false,
    rating: 4.8,
    students: 112,
    thumbnail: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=400&h=225&fit=crop',
    author: 'Верховская В.В.',
    level: 'Средний',
    tags: ['психология', 'клиенты', 'эмпатия'],
    lessons_list: [
      { id: 1, title: 'Психотипы клиентов', duration: '22 мин', completed: false },
      { id: 2, title: 'Страхи при покупке', duration: '18 мин', completed: false },
    ],
  },
  {
    id: 9,
    title: 'Личный бренд агента',
    description: 'Как стать узнаваемым в своём городе. Контент-стратегия, упаковка профиля, нишевая экспертность.',
    category: 'Маркетинг',
    duration: '6 часов',
    lessons: 18,
    progress: 0,
    completed: false,
    rating: 4.5,
    students: 89,
    thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=225&fit=crop',
    author: 'Колесникова А.В.',
    level: 'Средний',
    tags: ['бренд', 'контент', 'соцсети'],
    lessons_list: [
      { id: 1, title: 'Что такое личный бренд', duration: '15 мин', completed: false },
      { id: 2, title: 'Упаковка соцсетей', duration: '25 мин', completed: false },
    ],
  },
];

// ============================================================
// WEBINAR RECORDINGS — практические записи по сегментам рынка
// ============================================================

export type WebinarTopic = 'Новостройки' | 'Вторичка' | 'Юридический блок' | 'Ипотека' | 'Загородная' | 'Коммерческая';

export interface WebinarRecording {
  id: number;
  title: string;
  description: string;
  topic: WebinarTopic;
  duration: string;
  date: string;        // дата проведения
  views: number;
  speaker: string;
  thumbnail: string;
  isNew: boolean;
}

export const webinarRecordings: WebinarRecording[] = [
  { id: 1, title: 'Семейная ипотека 2.0 — новые условия с июня',           description: 'Разбор изменений семейной ипотеки. Кто попадает, как считается льгота, документы для банка.',         topic: 'Ипотека',           duration: '1ч 24мин', date: '2026-05-19', views: 1287, speaker: 'Колесникова А.В.', thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop', isNew: true },
  { id: 2, title: 'Топ-5 ЖК Москвы для инвестора в 2026',                    description: 'Объективный анализ инвестпотенциала пяти ЖК: цены, локация, перспективы роста.',                       topic: 'Новостройки',       duration: '58 мин',   date: '2026-05-12', views: 942,  speaker: 'Кулаков С.В.',     thumbnail: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=225&fit=crop', isNew: true },
  { id: 3, title: 'Альтернативная сделка: как не потерять цепочку',         description: 'Пошаговая инструкция по проведению альтернативных сделок. Подводные камни.',                          topic: 'Вторичка',          duration: '1ч 36мин', date: '2026-04-28', views: 1543, speaker: 'Мухин В.А.',       thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=225&fit=crop', isNew: false },
  { id: 4, title: 'Проверка квартиры перед покупкой: чек-лист юриста',      description: 'Все документы, которые нужно запросить у продавца. Где может прятаться подвох.',                          topic: 'Юридический блок',  duration: '47 мин',   date: '2026-04-20', views: 2014, speaker: 'Радченко Д.В.',    thumbnail: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=225&fit=crop', isNew: false },
  { id: 5, title: 'Загородные дома: что покупать в 2026',                    description: 'Сегменты загородной недвижимости, тренды. ИЖС, СНТ, коттеджные посёлки.',                              topic: 'Загородная',        duration: '1ч 12мин', date: '2026-04-15', views: 776,  speaker: 'Аникеев В.В.',     thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=225&fit=crop', isNew: false },
  { id: 6, title: 'Договор переуступки прав: всё что надо знать',           description: 'Когда выгодно покупать ДДУ переуступкой. Налоги, нюансы оформления.',                                   topic: 'Юридический блок',  duration: '52 мин',   date: '2026-04-08', views: 891,  speaker: 'Бакленкова И.Н.',  thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=225&fit=crop', isNew: false },
  { id: 7, title: 'Коммерческая аренда: офисы, склады, ритейл',              description: 'Виды коммерческих помещений. Как считается ставка, типичный срок договора.',                            topic: 'Коммерческая',      duration: '1ч 18мин', date: '2026-03-30', views: 412,  speaker: 'Бакленкова И.Н.',  thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=225&fit=crop', isNew: false },
  { id: 8, title: 'Ипотека для самозанятых и ИП',                             description: 'Какие банки работают с самозанятыми, какие справки нужны. Альтернативы стандартной 2-НДФЛ.',         topic: 'Ипотека',           duration: '1ч 06мин', date: '2026-03-22', views: 1129, speaker: 'Колесникова А.В.', thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=225&fit=crop', isNew: false },
  { id: 9, title: 'Эскроу-счёт на пальцах',                                   description: 'Как работают эскроу-счета при покупке новостройки. Защита покупателя.',                                topic: 'Новостройки',       duration: '38 мин',   date: '2026-03-15', views: 1856, speaker: 'Мухин В.А.',       thumbnail: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400&h=225&fit=crop', isNew: false },
  { id: 10, title: 'Сложные случаи в наследстве на квартиру',                description: 'Когда квартира продаётся через год после смерти. Доли, отказы, нотариус.',                              topic: 'Юридический блок',  duration: '1ч 02мин', date: '2026-03-10', views: 967,  speaker: 'Радченко Д.В.',    thumbnail: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&h=225&fit=crop', isNew: false },
];

// ============================================================
// EVENTS SCHEDULE — вебинары, мастер-классы и встречи на месяц
// ============================================================

export type EventFormat = 'webinar' | 'masterclass' | 'meeting' | 'training';

export interface AcademyEvent {
  id: number;
  title: string;
  description: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  speaker: string;
  format: EventFormat;
  topic?: WebinarTopic | CourseCategory | string;
  link?: string;       // ссылка на трансляцию
  location: string;    // 'Онлайн' или адрес
  capacity?: number;   // лимит участников
  registered: number;
}

export const academyEvents: AcademyEvent[] = [
  { id: 1, title: 'Семейная ипотека: разбор кейсов мая',  description: 'Открытый онлайн-вебинар. Разбираем 5 реальных кейсов клиентов за май: где попадает льгота, где нет.',                date: '2026-05-26', startTime: '14:00', endTime: '15:30', speaker: 'Колесникова А.В.', format: 'webinar',      topic: 'Ипотека',          location: 'Онлайн',                                                  registered: 87 },
  { id: 2, title: 'Утренний созвон команды',              description: 'Еженедельный созвон лидеров. Подводим итоги недели, ставим задачи.',                                                  date: '2026-05-27', startTime: '09:30', endTime: '10:30', speaker: 'Клименков М.М.',   format: 'meeting',                                 location: 'Zoom',                                                  registered: 12, capacity: 30 },
  { id: 3, title: 'Мастер-класс: продающая фотосессия',   description: 'Анна Колесникова показывает, как самим сделать качественные фото объектов на смартфон.',                                date: '2026-05-28', startTime: '11:00', endTime: '13:00', speaker: 'Колесникова А.В.', format: 'masterclass',  topic: 'Маркетинг',         location: 'Москва, БЦ «Меркурий», 14 этаж',                          registered: 18, capacity: 20 },
  { id: 4, title: 'Новостройки СПб: тренды Q2 2026',      description: 'Свежие данные по запускам и ценам. Какие ЖК уходят с рынка, какие будут в топе.',                                       date: '2026-05-29', startTime: '15:00', endTime: '16:30', speaker: 'Верховская В.В.',  format: 'webinar',      topic: 'Новостройки',       location: 'Онлайн',                                                  registered: 156 },
  { id: 5, title: 'Тренинг новичков: первая сделка',      description: 'Закрытый тренинг для агентов первого месяца. Разбираем типичные ошибки.',                                                date: '2026-05-30', startTime: '10:00', endTime: '14:00', speaker: 'Мухин В.А.',       format: 'training',     topic: 'Базовый',           location: 'Москва, БЦ «Меркурий», 14 этаж',                          registered: 8, capacity: 12 },
  { id: 6, title: 'Юридический блок: типичные ошибки',    description: 'Дмитрий Радченко разбирает 10 ошибок, которые чаще всего срывают сделки.',                                              date: '2026-06-02', startTime: '13:00', endTime: '14:30', speaker: 'Радченко Д.В.',    format: 'webinar',      topic: 'Юридический блок',  location: 'Онлайн',                                                  registered: 64 },
  { id: 7, title: 'Загородная сезона 2026',                description: 'Сезонные тренды в загородной недвижимости. Что покупают и за сколько.',                                                 date: '2026-06-05', startTime: '14:00', endTime: '15:30', speaker: 'Аникеев В.В.',     format: 'webinar',      topic: 'Загородная',         location: 'Онлайн',                                                  registered: 43 },
  { id: 8, title: 'Лидерство в команде',                  description: 'Михаил Клименков делится принципами построения команды на 50+ агентов.',                                                  date: '2026-06-09', startTime: '16:00', endTime: '17:30', speaker: 'Клименков М.М.',   format: 'webinar',      topic: 'Лидерство',          location: 'Онлайн',                                                  registered: 124 },
  { id: 9, title: 'MLM на пальцах',                        description: 'Закрытая встреча для лидеров уровня L2+. Тонкая настройка маркетингового плана.',                                       date: '2026-05-24', startTime: '18:00', endTime: '19:30', speaker: 'Клименков М.М.',   format: 'meeting',      topic: 'МЛМ',                location: 'Zoom',                                                  registered: 6, capacity: 15 },
  { id: 10, title: 'Эфир: вопрос-ответ с CEO',             description: 'Открытый эфир в Telegram. Михаил отвечает на любые вопросы агентов.',                                                  date: '2026-06-12', startTime: '20:00', endTime: '21:00', speaker: 'Клименков М.М.',   format: 'webinar',                                  location: 'Telegram Live',                                          registered: 312 },
];

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  likes: number;
  featured: boolean;
  image: string;
  author: string;
}

export const newsArticles: NewsArticle[] = [
  {
    id: 1,
    title: 'Рынок недвижимости Москвы: итоги мая 2026',
    summary: 'Объем сделок вырос на 23% по сравнению с апрелем. Эксперты связывают это со снижением ипотечных ставок.',
    content: `Май 2026 года стал одним из самых активных месяцев на московском рынке недвижимости за последние два года. По данным Росреестра, общий объём сделок купли-продажи вырос на 23% по сравнению с апрелем и на 41% относительно прошлого мая.

Главным драйвером роста стало снижение ключевой ставки ЦБ на 1,5 п.п. в начале мая. Это повлекло за собой удешевление ипотечных программ — средняя ставка по рыночной ипотеке опустилась до 11,8%, а по программам с господдержкой — до 5,9%.

Особенно заметна активность в сегменте вторичного жилья комфорт-класса: здесь рост составил 31%. Покупатели возвращаются с накопленным запросом, отложенным с осени 2025-го.

Что это значит для агентов Welcome 24:
• Увеличение потока заявок на показ — будьте готовы к высокой нагрузке;
• Клиенты охотнее закрывают сделки в течение 2–3 недель после первого показа;
• Растёт спрос на квартиры с готовым ремонтом и в шаговой доступности от метро.

Прогноз: июнь покажет похожую динамику. Если ЦБ не повысит ставку на ближайшем заседании, мы ожидаем устойчивый рост до конца квартала.`,
    category: 'Рынок',
    date: '2026-05-22',
    readTime: '4 мин',
    likes: 87,
    featured: true,
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=400&fit=crop',
    author: 'Редакция Welcome 24',
  },
  {
    id: 2,
    title: 'Новые условия комиссионной программы с июня',
    summary: 'Welcome 24 повышает вознаграждение агентов 2-го уровня. Подробности изменений.',
    content: `С 1 июня 2026 года вступают в силу обновлённые условия комиссионной программы Welcome 24.

Главное изменение — рост растущего дохода для агентов второго уровня MLM с 2,5% до 2,8%. Это позволит активным лидерам команд значительно увеличить пассивный доход уже в первый месяц после изменения.

Также мы пересмотрели годовые «потолки» дохода с одного агента:
• Уровень 1: 100 000 ₽ (без изменений)
• Уровень 2: 120 000 ₽ (было 100 000)
• Уровень 3: 80 000 ₽ (было 70 000)
• Уровень 4: 60 000 ₽ (без изменений)
• Уровень 5: 30 000 ₽ (новый параметр)

Для кого это особенно важно:
• Агентов, которые уже привлекли 5+ человек на первый уровень — увеличение дохода будет ощутимым;
• Лидеров команд старше года в компании — открываются дополнительные стимулы развивать структуру вглубь.

Полную обновлённую таблицу плана смотрите в разделе «Команда». Если есть вопросы — пишите в техподдержку или личному менеджеру.`,
    category: 'Компания',
    date: '2026-05-20',
    readTime: '3 мин',
    likes: 142,
    featured: false,
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
    author: 'Клименков М.М.',
  },
  {
    id: 3,
    title: 'Вебинар: ипотека в 2026 — что изменилось',
    summary: 'Приглашаем агентов на бесплатный вебинар 28 мая. Разбираем новые ипотечные продукты банков.',
    content: `28 мая в 14:00 проводим живой вебинар «Ипотека в 2026 — что изменилось». Эксперт — Анна Колесникова, ведущий ипотечный брокер Welcome 24 с опытом 12 лет и более 1500 закрытых сделок.

Программа:
1. Свежие изменения ставок ЦБ и их влияние на ставки банков;
2. Семейная ипотека 2.0 — новые условия с 1 июня;
3. Программа «Молодая семья» — кто реально может получить;
4. Альтернативные программы для тех, кому отказали;
5. Чек-лист документов: что собрать клиенту до похода в банк;
6. Q&A — отвечаю на ваши конкретные кейсы.

После вебинара участники получают:
• PDF-чек-лист с актуальными ставками 12 банков;
• Шаблон письма «Как уговорить банк снизить ставку»;
• Доступ к закрытому Telegram-каналу для агентов.

Зарегистрироваться можно по реферальной ссылке в разделе Профиль. Запись будет доступна в Академии через 48 часов после эфира.`,
    category: 'Обучение',
    date: '2026-05-19',
    readTime: '2 мин',
    likes: 56,
    featured: false,
    image: 'https://images.unsplash.com/photo-1558403194-611308249627?w=400&h=225&fit=crop',
    author: 'Учебный центр W24',
  },
  {
    id: 4,
    title: 'Топ-5 ошибок при показе квартиры',
    summary: 'Разбираем типичные ошибки, которые мешают закрыть сделку. Советы опытных агентов.',
    content: `За 12 лет в недвижимости я провёл больше 3 000 показов. И в 80% случаев, когда сделка срывалась после показа — причина была не в объекте, а в моих ошибках. Поделюсь самыми частыми.

1. Опоздание на показ. Даже 5 минут — это сигнал клиенту: «вы для меня неважны». Приезжайте за 10–15 минут раньше, проветрите квартиру, включите свет, поставьте лёгкую музыку.

2. «Продавать» с порога. Не говорите про преимущества первые 3 минуты — дайте клиенту почувствовать пространство. Покупка квартиры — эмоциональное решение, и эмоция должна возникнуть до рациональных доводов.

3. Замалчивать недостатки. Если в подъезде грязно, рядом стройка или скрипит дверь — скажите первым. Это укрепляет доверие. Клиент всё равно увидит, и тогда вы потеряете не только доверие, но и сделку.

4. Перегруз информацией. Не вываливайте на клиента все 30 фактов о районе сразу. Задавайте вопросы, слушайте, что важно именно для него — и подсвечивайте только это.

5. Не делать follow-up. Клиент в 90% случаев не примет решение на показе. Напишите через 2 часа: «Спасибо, что пришли. Если будут вопросы — я на связи». Через день — пришлите чек-лист по объекту. Через 3 дня — спросите, сравнивает ли с другими.

Сохраняйте, применяйте, делитесь в комментариях своим опытом.`,
    category: 'Советы',
    date: '2026-05-17',
    readTime: '5 мин',
    likes: 218,
    featured: false,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=225&fit=crop',
    author: 'Кулаков С.В.',
  },
  {
    id: 5,
    title: 'Welcome 24 выходит в Екатеринбург и Новосибирск',
    summary: 'Компания расширяет географию присутствия. Ищем региональных лидеров для развития команд.',
    content: `С июня 2026 года Welcome 24 официально начинает работу в Екатеринбурге и Новосибирске. Это уже шестой и седьмой города в нашей географии после Москвы, Санкт-Петербурга, Краснодара, Казани и Нижнего Новгорода.

В каждом городе мы открываем «якорный офис» — оборудованное рабочее пространство для 25–30 агентов, переговорная для встреч с клиентами, фотостудия для съёмки объектов и зона для обучения.

Что мы ищем — региональных лидеров. Если вы:
• Опытный агент с командой 5+ человек;
• Понимаете локальный рынок;
• Готовы строить структуру с нуля и масштабировать её до 100+ агентов в течение года;
• Хотите получить долю в местном офисе и опционы на акции компании —
напишите личному менеджеру или мне напрямую (mk@w24.agency).

Условия для региональных лидеров:
• Базовая комиссия 95% сразу, без накопления ВКД;
• Override 7% с команды (вместо стандартных 3,5%);
• Личные акции Welcome 24 — от 500 шт сразу;
• Покрытие операционных расходов офиса на первые 6 месяцев.

Цель — закрыть 100+ сделок в каждом городе до конца 2026.`,
    category: 'Компания',
    date: '2026-05-15',
    readTime: '3 мин',
    likes: 94,
    featured: false,
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=225&fit=crop',
    author: 'Редакция Welcome 24',
  },
  {
    id: 6,
    title: 'Кейс: как Степан Кулаков сделал 24 сделки за 5 месяцев',
    summary: 'Топ-агент рассказывает о своей системе работы с клиентами и технике закрытия сделок.',
    content: `Степан Кулаков пришёл в Welcome 24 в январе 2026 года из другой агентской компании, где за 3 года провёл всего 14 сделок. У нас он закрыл 24 сделки за пять месяцев — почти 5 сделок в месяц. Спросили, как это получилось.

«Главное изменение — я перестал быть „агентом“ и стал „консультантом по решениям“. Клиенты не покупают квартиры, они покупают решение проблемы: переехать к школе, разъехаться с родителями, инвестировать накопления. Я начинаю разговор не с „какой бюджет“, а с „какую жизнь хотите через год“.»

Система Степана состоит из 4 принципов:

1. CRM-первого касания. Каждый входящий контакт — в CRM в течение часа. Тегирую по «горячести» и каналу. Не оставляю заявок без ответа дольше 30 минут.

2. Бриф из 7 вопросов. Не показываю ни одного объекта, пока клиент не ответит на 7 вопросов: жизненная ситуация, бюджет потолок и комфорт, район, временные рамки, основные критерии «да», красные флаги «нет», участники решения.

3. Подборка вместо потока. На основе брифа делаю подборку из 3 максимум 5 объектов. Не больше. Если из них не выбрали — не делаю «вторую попытку», а возвращаюсь к брифу: где ошибся в понимании.

4. Закрытие через тишину. После показа и обсуждения цены — молчу. Минута тишины делает больше, чем час уговоров.

«За пять месяцев я заработал больше, чем за три года на прошлом месте. Если что — я открыт для менторства, пишите в Telegram.»`,
    category: 'Кейсы',
    date: '2026-05-12',
    readTime: '7 мин',
    likes: 367,
    featured: false,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop',
    author: 'Кулаков С.В.',
  },
];

export const teamData = {
  levels: [
    { level: 1, agents: 6, percent: 3.5, income: 217706 },
    { level: 2, agents: 8, percent: 2.8, income: 93568 },
    { level: 3, agents: 11, percent: 0.1, income: 10564 },
    { level: 4, agents: 10, percent: 0.1, income: 4960 },
    { level: 5, agents: 12, percent: 0.1, income: 3499 },
    { level: 6, agents: 1, percent: 0.5, income: 1952 },
    { level: 7, agents: 0, percent: 0.5, income: 0 },
  ],
  members: [
    { id: 1, name: 'Радченко Дмитрий Владимирович', level: 1, teamSize: 5, limit: 100000, income: 22439, active: true, joinDate: '2025-01' },
    { id: 2, name: 'Верховская Валерия Владимировна', level: 1, teamSize: 1, limit: 100000, income: 12408, active: true, joinDate: '2025-02' },
    { id: 3, name: 'Изотов Илья Анатольевич', level: 1, teamSize: 1, limit: 100000, income: 8750, active: true, joinDate: '2025-03' },
    { id: 4, name: 'Кулаков Степан Владимирович', level: 1, teamSize: 6, limit: 100000, income: 41524, active: true, joinDate: '2025-01' },
    { id: 5, name: 'Бородина Елена Валерьевна', level: 1, teamSize: 1, limit: 100000, income: 0, active: true, joinDate: '2025-04' },
    { id: 6, name: 'Михалева Полина Игоревна', level: 1, teamSize: 1, limit: 100000, income: 0, active: false, joinDate: '2025-05' },
    { id: 7, name: 'Ситников Андрей Николаевич', level: 1, teamSize: 1, limit: 100000, income: 100000, active: true, joinDate: '2024-12' },
    { id: 8, name: 'Санкин Александр Александрович', level: 1, teamSize: 2, limit: 100000, income: 0, active: false, joinDate: '2025-02' },
    { id: 9, name: 'Мухин Вячеслав Александрович', level: 1, teamSize: 10, limit: 100000, income: 32585, active: true, joinDate: '2024-11' },
  ],
  totalIncome: 332249,
  totalAgents: 48,
};

export interface AgentReview {
  id: number;
  author: string;       // ФИО автора отзыва
  initials: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;         // YYYY-MM-DD
  text: string;
}

export interface AgentSocials {
  telegram?: string;          // личный TG, username без @
  telegramChannel?: string;   // TG-канал, например @welcome24_news
  instagram?: string;
  vk?: string;                // короткое имя или id
  max?: string;               // MAX-мессенджер, username
  youtube?: string;
  website?: string;           // личный сайт агента, без схемы (siteName)
}

export interface AgentBaseRecord {
  id: number;
  name: string;
  city: string;
  primaryDir: string[];
  secondaryDir: string[];
  deals: number;          // закрытых сделок за всё время
  experienceYears: number;
  phone: string;
  photo: string | null;   // URL фото или null (показать инициалы)
  socials: AgentSocials;
  bio: string;            // короткое описание о себе
  rating: number;         // средний рейтинг (1.0–5.0)
  reviews: AgentReview[];
}

export const agentsBase: AgentBaseRecord[] = [
  {
    id: 1, name: 'Абрамов Андрей Юрьевич', city: 'Москва', primaryDir: ['Жилая'], secondaryDir: ['Загородная'], deals: 8, experienceYears: 4,
    phone: '+7 (905) 111-22-33', photo: null,
    socials: { telegram: 'abramov_a', max: 'abramov.real' },
    bio: 'Помогаю молодым семьям найти первую квартиру в Москве. Знаю все программы льготной ипотеки, всегда нахожу 2-3 альтернативы.',
    rating: 4.5,
    reviews: [
      { id: 1, author: 'Иванов А.С.', initials: 'ИА', rating: 5, date: '2026-04-12', text: 'Андрей помог с покупкой первой квартиры в Бутово. Терпеливо объяснял каждый этап, нашёл нам отличную ипотеку под 5,9%.' },
      { id: 2, author: 'Сидорова М.В.', initials: 'СМ', rating: 4, date: '2026-03-08', text: 'Доволен сделкой, но иногда отвечает не сразу. В целом — рекомендую.' },
    ],
  },
  {
    id: 2, name: 'Авраменко Анна Игоревна', city: 'Краснодар', primaryDir: ['Жилая'], secondaryDir: [], deals: 3, experienceYears: 1,
    phone: '+7 (918) 222-33-44', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'avramenko_anna', instagram: 'anna.avramenko', vk: 'anna_avramenko' },
    bio: 'Начинающий агент, но уже закрыла 3 сделки за полгода. Делаю красивые фото объектов сама, веду блог в Instagram.',
    rating: 4.8,
    reviews: [
      { id: 1, author: 'Петров К.Л.', initials: 'ПК', rating: 5, date: '2026-05-02', text: 'Анна — настоящая находка! Очень внимательная, дотошная. Знает все ЖК Краснодара лучше, чем сами застройщики.' },
    ],
  },
  {
    id: 3, name: 'Азаматова Наталья Фёдоровна', city: 'Москва', primaryDir: ['Жилая'], secondaryDir: ['Жилая'], deals: 5, experienceYears: 3,
    phone: '+7 (916) 333-44-55', photo: null,
    socials: { telegram: 'azamatova' },
    bio: 'Специализация — вторичный рынок ЦАО и Хамовники. Если ищете квартиру в престижном районе — звоните.',
    rating: 4.6, reviews: [],
  },
  {
    id: 4, name: 'Аникеев Виктор Викторович', city: 'Севастополь', primaryDir: ['Жилая'], secondaryDir: ['Загородная'], deals: 11, experienceYears: 7,
    phone: '+7 (978) 444-55-66', photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'anikeev_v', telegramChannel: '@anikeev_crimea', vk: 'anikeev_crimea' },
    bio: 'Эксперт по Крыму. 7 лет в недвижимости, 100+ сделок. Помогу с покупкой жилья, виллы у моря или загородного дома.',
    rating: 4.9,
    reviews: [
      { id: 1, author: 'Михайлов С.А.', initials: 'МС', rating: 5, date: '2026-04-25', text: 'Купил квартиру в Севастополе через Виктора. Профессионал высочайшего класса, всё прошло гладко. Рекомендую!' },
      { id: 2, author: 'Кузнецова Е.Н.', initials: 'КЕ', rating: 5, date: '2026-03-15', text: 'Помог найти дом у моря в идеальном месте. Знает всех собственников лично.' },
      { id: 3, author: 'Орлов Д.В.', initials: 'ОД', rating: 4, date: '2026-02-04', text: 'Хороший агент, но цены на его услуги выше рынка.' },
    ],
  },
  {
    id: 5, name: 'Арутюнова Элона Суреновна', city: 'Анапа', primaryDir: ['Жилая'], secondaryDir: [], deals: 2, experienceYears: 1,
    phone: '+7 (928) 555-66-77', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'elona_anapa', instagram: 'elona.realty' },
    bio: 'Помогаю с покупкой курортного жилья в Анапе. Знаю все санатории и пансионаты, которые сдают апартаменты.',
    rating: 4.7, reviews: [],
  },
  {
    id: 6, name: 'Бакленкова Ирина Николаевна', city: 'Москва', primaryDir: ['Коммерческая'], secondaryDir: ['Жилая'], deals: 4, experienceYears: 5,
    phone: '+7 (903) 666-77-88', photo: null,
    socials: { telegram: 'baklenkova', vk: 'irina.bak' },
    bio: 'Коммерческая недвижимость: офисы, склады, торговые помещения. Работаю с собственниками и арендаторами.',
    rating: 4.4,
    reviews: [
      { id: 1, author: 'ООО «Альфа»', initials: 'ОА', rating: 4, date: '2026-04-18', text: 'Помогла снять офис в БЦ за хорошие условия. Спасибо за работу!' },
    ],
  },
  {
    id: 7, name: 'Безвиконная Елена Владимировна', city: 'Геленджик', primaryDir: ['Жилая'], secondaryDir: [], deals: 1, experienceYears: 1,
    phone: '+7 (988) 777-88-99', photo: null,
    socials: { telegram: 'elena_bezv' },
    bio: 'Начинающий агент в Геленджике. Открыта к сотрудничеству, готова делать максимум для клиента.',
    rating: 5.0, reviews: [],
  },
  {
    id: 8, name: 'Белоус Татьяна Алексеевна', city: 'Москва', primaryDir: ['Жилая'], secondaryDir: [], deals: 9, experienceYears: 4,
    phone: '+7 (916) 888-99-00', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'belous_t', instagram: 'tatyana.belous', max: 'belous_t' },
    bio: 'Работаю в Москве и Ростове-на-Дону. Команда из 3 ассистентов, делаем сделки под ключ за 2-3 недели.',
    rating: 4.7,
    reviews: [
      { id: 1, author: 'Шкепу О.В.', initials: 'ШО', rating: 5, date: '2026-05-05', text: 'Татьяна — лучший агент, с которым я работала. Всё чётко, быстро, без нервов.' },
    ],
  },
  {
    id: 9, name: 'Верховская Валерия Владимировна', city: 'СПб', primaryDir: ['Жилая'], secondaryDir: ['Коммерческая'], deals: 15, experienceYears: 6,
    phone: '+7 (921) 999-00-11', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'verkhovskaya', instagram: 'valeria.spb', vk: 'verkhovskaya_v' },
    bio: 'Топовый агент Петербурга. Специализируюсь на квартирах в исторических домах и новостройках Петроградского района.',
    rating: 4.9,
    reviews: [
      { id: 1, author: 'Новикова Т.О.', initials: 'НТ', rating: 5, date: '2026-05-18', text: 'Валерия нашла мне квартиру моей мечты на Невском! Невероятный профессионализм.' },
      { id: 2, author: 'Семёнов А.К.', initials: 'СА', rating: 5, date: '2026-04-02', text: 'Лучший агент в СПб без преувеличения.' },
    ],
  },
  {
    id: 10, name: 'Кулаков Степан Владимирович', city: 'Москва', primaryDir: ['Жилая'], secondaryDir: ['Загородная'], deals: 24, experienceYears: 3,
    phone: '+7 (905) 123-45-67', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'kulakov_step', telegramChannel: '@kulakov_property', instagram: 'stepan.kulakov', youtube: '@kulakov_realty' },
    bio: 'Топ-1 агент Welcome 24. 24 сделки за 5 месяцев. Веду YouTube-канал про недвижимость. Открыт для менторства.',
    rating: 5.0,
    reviews: [
      { id: 1, author: 'Петров И.А.', initials: 'ПИ', rating: 5, date: '2026-05-10', text: 'Степан — это уровень! Закрыл сделку на 4.5 млн ВКД за две недели. Я бы и за месяц не справился.' },
      { id: 2, author: 'Орлова Н.С.', initials: 'ОН', rating: 5, date: '2026-05-22', text: 'Помог купить дом на Рублёвке. Знает всех важных людей в этом районе.' },
      { id: 3, author: 'Михалева П.И.', initials: 'МП', rating: 5, date: '2026-04-30', text: 'Лучший наставник! Его принципы продаж работают на 100%.' },
    ],
  },
  {
    id: 11, name: 'Радченко Дмитрий Владимирович', city: 'Краснодар', primaryDir: ['Жилая'], secondaryDir: ['Коммерческая'], deals: 19, experienceYears: 5,
    phone: '+7 (918) 234-56-78', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    socials: { telegram: 'radchenko_d', telegramChannel: '@krasnodar_realty', instagram: 'dmitriy.radchenko' },
    bio: 'Краснодарский край и побережье. Помогу с покупкой квартиры, дома или коммерческого объекта. Большая база клиентов из Москвы.',
    rating: 4.8,
    reviews: [
      { id: 1, author: 'Сидорова М.В.', initials: 'СМ', rating: 5, date: '2026-05-15', text: 'Подобрал отличную квартиру в новостройке ЖК «Южный». Очень довольна!' },
    ],
  },
  {
    id: 12, name: 'Мухин Вячеслав Александрович', city: 'Москва', primaryDir: ['Жилая'], secondaryDir: [], deals: 17, experienceYears: 4,
    phone: '+7 (916) 345-67-89', photo: null,
    socials: { telegram: 'mukhin_v', vk: 'mukhin_realty' },
    bio: 'Спецагент по сложным сделкам: расселение коммуналок, наследство, проблемная история объекта.',
    rating: 4.6,
    reviews: [
      { id: 1, author: 'Козлов Д.П.', initials: 'КД', rating: 5, date: '2026-05-20', text: 'Помог с расселением коммуналки на Проспекте Мира. Сложнейшая сделка, всё прошло без проблем.' },
    ],
  },
];

// Monthly aggregates derived from myDeals
const monthBuckets: Record<string, { vkd: number; income: number; deals: number }> = {
  '01': { vkd: 0, income: 0, deals: 0 }, '02': { vkd: 0, income: 0, deals: 0 },
  '03': { vkd: 0, income: 0, deals: 0 }, '04': { vkd: 0, income: 0, deals: 0 },
  '05': { vkd: 0, income: 0, deals: 0 }, '06': { vkd: 0, income: 0, deals: 0 },
  '07': { vkd: 0, income: 0, deals: 0 }, '08': { vkd: 0, income: 0, deals: 0 },
  '09': { vkd: 0, income: 0, deals: 0 }, '10': { vkd: 0, income: 0, deals: 0 },
  '11': { vkd: 0, income: 0, deals: 0 }, '12': { vkd: 0, income: 0, deals: 0 },
};
myDeals.forEach(d => {
  const m = d.date.slice(5, 7);
  monthBuckets[m].vkd += d.vkd;
  monthBuckets[m].income += d.income;
  monthBuckets[m].deals += 1;
});
const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export const monthlyStats = Object.entries(monthBuckets).map(([k, v], i) => ({ month: monthNames[i], ...v }));

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  earned: boolean;
  date: string;
  tier: AchievementTier;
  period?: string;       // 'YYYY' для повторяющихся за год, '' для разовых
  isYearly?: boolean;
}

export const achievements: Achievement[] = [
  { id: 'first_agent',        title: 'Первый рекрут',     icon: '🤝', description: 'Привёл первого агента в команду',            earned: true,  date: '2024-04-10', tier: 'bronze'   },
  { id: 'first_deal',         title: 'Первая сделка',     icon: '🏠', description: 'Закрыл первую сделку в Welcome 24',          earned: true,  date: '2026-04-05', tier: 'bronze'   },
  { id: 'commission_1m',      title: 'Миллион в копилку', icon: '💎', description: '1 000 000 ₽ комиссии за год',                earned: true,  date: '2026-05-19', tier: 'silver'   },
  { id: 'level_2',            title: 'Старшая лига 90%',  icon: '⚡', description: '2 000 000 ₽ ВКД — переход на 90% комиссии',  earned: false, date: '',           tier: 'gold'     },
  { id: 'level_3',            title: 'Элитный 95%',       icon: '👑', description: '5 000 000 ₽ ВКД — переход на 95% комиссии',  earned: false, date: '',           tier: 'platinum' },
  { id: 'team_10',            title: 'Капитан десятки',   icon: '👥', description: '10 агентов на первом уровне команды',        earned: true,  date: '2025-09-12', tier: 'silver'   },
  { id: 'team_50',            title: 'Армия из 50',       icon: '🏆', description: '50 агентов на первом уровне команды',        earned: false, date: '',           tier: 'gold'     },
  { id: 'deals_10',           title: 'Десятка',           icon: '🔥', description: '10 сделок за один год',                       earned: false, date: '',           tier: 'silver'   },
  { id: 'deals_30',           title: 'Тридцатка',         icon: '⭐', description: '30 сделок за один год',                       earned: false, date: '',           tier: 'gold'     },
  { id: 'deals_50',           title: 'Полтинник',         icon: '💫', description: '50 сделок за один год',                       earned: false, date: '',           tier: 'platinum' },
  { id: 'total_10m',          title: 'Декамиллионер',     icon: '💰', description: '10 000 000 ₽ общей комиссии за карьеру',     earned: false, date: '',           tier: 'platinum' },
];

// ============================================================
// MLM MARKETING PLAN — пассивный доход с команды
// ============================================================

export interface MarketingPlanLevel {
  level: number;
  protected: number;  // % защищённого дохода (есть всегда)
  growing: number | null; // % растущего дохода (доплата при выполнении условия)
  required: number | null; // нужно агентов на 1 уровне с минимум 1 сделкой
  capPerAgent: number;     // максимальный доход с одного агента в год (₽)
}

export const MARKETING_PLAN: MarketingPlanLevel[] = [
  { level: 1, protected: 3.5, growing: null, required: null, capPerAgent: 100_000 },
  { level: 2, protected: 0.1, growing: 2.8,  required: 5,    capPerAgent: 120_000 },
  { level: 3, protected: 0.1, growing: 2.4,  required: 10,   capPerAgent: 80_000  },
  { level: 4, protected: 0.1, growing: 1.4,  required: 15,   capPerAgent: 60_000  },
  { level: 5, protected: 0.1, growing: 0.9,  required: 20,   capPerAgent: 30_000  },
  { level: 6, protected: 0.5, growing: 2.0,  required: 25,   capPerAgent: 50_000  },
  { level: 7, protected: 0.5, growing: 4.0,  required: 40,   capPerAgent: 100_000 },
];

// ============================================================
// Agents from real data (Excel "Лист Microsoft Excel.xlsx", май 2026)
// teamLevel — позиция агента в MLM-структуре Михаила (1..7)
// ============================================================
export interface TeamAgent {
  id: number; name: string; phone: string; city: string;
  level: 1 | 2 | 3; commission: 80 | 90 | 95;
  joinDate: string; status: 'active' | 'inactive';
  teamLevel: number; // 1..7 — уровень в дереве команды
}

export const teamAgents: TeamAgent[] = [
  // ▸ MLM Уровень 1 — прямые рекруты Михаила (6 человек, открыт «растущий» доход на L2)
  { id: 2,  name: 'Бондарь Светлана Алексеевна',         phone: '+7 (916) 200-01-02', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-04-12', status: 'active',   teamLevel: 1 },
  { id: 3,  name: 'Соколенко Елена Николаевна',          phone: '+7 (905) 200-01-03', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-06-22', status: 'active',   teamLevel: 1 },
  { id: 9,  name: 'Мухин Вячеслав Александрович',        phone: '+7 (916) 200-01-09', city: 'Москва',     level: 1, commission: 80, joinDate: '2024-11-05', status: 'active',   teamLevel: 1 },
  { id: 15, name: 'Колесникова Анна Викторовна',         phone: '+7 (903) 200-01-15', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-02-01', status: 'active',   teamLevel: 1 },
  { id: 18, name: 'Шадрина Ольга Юрьевна',               phone: '+7 (918) 200-01-18', city: 'Краснодар',  level: 1, commission: 80, joinDate: '2025-12-10', status: 'active',   teamLevel: 1 },
  { id: 21, name: 'Кузин Дмитрий Владимирович',          phone: '+7 (916) 200-01-21', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-01-30', status: 'active',   teamLevel: 1 },
  // ▸ MLM Уровень 2 — рекруты от агентов 1-го уровня (8 человек)
  { id: 4,  name: 'Удачина Наталья Павловна',            phone: '+7 (918) 200-01-04', city: 'Краснодар',  level: 1, commission: 80, joinDate: '2025-08-14', status: 'active',   teamLevel: 2 },
  { id: 5,  name: 'Зуфаров Олег Ансарович',              phone: '+7 (903) 200-01-05', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-02-04', status: 'active',   teamLevel: 2 },
  { id: 6,  name: 'Хавалджи Виталий Васильевич',         phone: '+7 (921) 200-01-06', city: 'СПб',        level: 1, commission: 80, joinDate: '2025-09-09', status: 'active',   teamLevel: 2 },
  { id: 8,  name: 'Белоус Татьяна Алексеевна',           phone: '+7 (905) 200-01-08', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-01-15', status: 'active',   teamLevel: 2 },
  { id: 12, name: 'Шкепу Ольга Вячеславовна',            phone: '+7 (921) 200-01-12', city: 'СПб',        level: 1, commission: 80, joinDate: '2025-05-10', status: 'active',   teamLevel: 2 },
  { id: 13, name: 'Фрикацел (Зернов) Альберт Юрьевич',   phone: '+7 (905) 200-01-13', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-10-01', status: 'active',   teamLevel: 2 },
  { id: 14, name: 'Орехов Вадим Вагидович',              phone: '+7 (916) 200-01-14', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-08-22', status: 'active',   teamLevel: 2 },
  { id: 23, name: 'Тарасова Юлия Талгисовна',            phone: '+7 (905) 200-01-23', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-10-20', status: 'active',   teamLevel: 2 },
  // ▸ MLM Уровень 3 (8 человек)
  { id: 7,  name: 'Курбанова Галина Николаевна',         phone: '+7 (916) 200-01-07', city: 'Москва',     level: 1, commission: 80, joinDate: '2024-12-01', status: 'inactive', teamLevel: 3 },
  { id: 10, name: 'Заславская Юлия Ефимовна',            phone: '+7 (903) 200-01-10', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-11-20', status: 'active',   teamLevel: 3 },
  { id: 11, name: 'Ключникова Елена Владимировна',       phone: '+7 (916) 200-01-11', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-07-03', status: 'active',   teamLevel: 3 },
  { id: 16, name: 'Барышева Наталия',                    phone: '+7 (905) 200-01-16', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-03-04', status: 'active',   teamLevel: 3 },
  { id: 17, name: 'Семенов Роман Германович',            phone: '+7 (916) 200-01-17', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-09-25', status: 'active',   teamLevel: 3 },
  { id: 20, name: 'Тохтарова Марина',                    phone: '+7 (921) 200-01-20', city: 'СПб',        level: 1, commission: 80, joinDate: '2025-11-12', status: 'active',   teamLevel: 3 },
  { id: 22, name: 'Островская Лилия Леонидовна',         phone: '+7 (903) 200-01-22', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-02-15', status: 'active',   teamLevel: 3 },
  { id: 26, name: 'Лекарева Ольга Александровна',        phone: '+7 (916) 200-01-26', city: 'Москва',     level: 1, commission: 80, joinDate: '2025-08-08', status: 'active',   teamLevel: 3 },
  // ▸ MLM Уровень 4 (5 человек)
  { id: 19, name: 'Денисов Олег Николаевич',             phone: '+7 (905) 200-01-19', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-01-08', status: 'active',   teamLevel: 4 },
  { id: 24, name: 'Гайниденова Миргуль Сетботаловна',    phone: '+7 (916) 200-01-24', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-01-12', status: 'active',   teamLevel: 4 },
  { id: 25, name: 'Богинская Ирина Сергеевна',           phone: '+7 (905) 200-01-25', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-02-22', status: 'active',   teamLevel: 4 },
  { id: 27, name: 'Храмова Наталья Николаевна',          phone: '+7 (905) 200-01-27', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-01-25', status: 'active',   teamLevel: 4 },
  { id: 28, name: 'Левчук Ольга Владимировна',           phone: '+7 (916) 200-01-28', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-02-05', status: 'active',   teamLevel: 4 },
  // ▸ MLM Уровень 5 (3 человек)
  { id: 30, name: 'Терентьев Сергей Иванович',           phone: '+7 (903) 200-01-30', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-03-14', status: 'active',   teamLevel: 5 },
  { id: 31, name: 'Карьгина Ольга Юрьевна',              phone: '+7 (905) 200-01-31', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-02-18', status: 'active',   teamLevel: 5 },
  { id: 32, name: 'Алтабасова Майя Тагировна',           phone: '+7 (916) 200-01-32', city: 'Москва',     level: 1, commission: 80, joinDate: '2026-03-01', status: 'active',   teamLevel: 5 },
];

// Deals of the team (47 deals from Excel, excluding self-named duplicate row)
export interface TeamDeal {
  id: number; agentId: number; agentName: string;
  date: string; client: string; type: string;
  vkd: number; income: number; commission: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
}

export const teamDeals: TeamDeal[] = [
  { id: 100, agentId: 18, agentName: 'Шадрина Ольга Юрьевна',                date: '2026-05-04', client: 'Владимирова Людмила Витальевна', type: 'вторичка',    vkd: 50000,  income: 40000,  commission: 80, status: 'paid' },
  { id: 101, agentId: 3,  agentName: 'Соколенко Елена Николаевна',           date: '2026-05-04', client: 'Пономарёва Наталья Леонидовна',  type: 'вторичка',    vkd: 200000, income: 160000, commission: 80, status: 'paid' },
  { id: 102, agentId: 5,  agentName: 'Зуфаров Олег Ансарович',               date: '2026-05-04', client: 'Захарова Дарья Дмитриевна',      type: 'вторичка',    vkd: 390000, income: 312000, commission: 80, status: 'paid' },
  { id: 103, agentId: 8,  agentName: 'Белоус Татьяна Алексеевна',            date: '2026-05-05', client: 'Шкепу Ольга Вячеславовна',       type: 'вторичка',    vkd: 318000, income: 254400, commission: 80, status: 'paid' },
  { id: 104, agentId: 9,  agentName: 'Мухин Вячеслав Александрович',         date: '2026-05-05', client: 'Белоус Татьяна Алексеевна',      type: 'вторичка',    vkd: 318000, income: 254400, commission: 80, status: 'paid' },
  { id: 105, agentId: 3,  agentName: 'Соколенко Елена Николаевна',           date: '2026-05-05', client: 'Зайчёнок Наталья Викторовна',    type: 'вторичка',    vkd: 400000, income: 320000, commission: 80, status: 'paid' },
  { id: 106, agentId: 19, agentName: 'Денисов Олег Николаевич',              date: '2026-05-06', client: 'Пинчукова Наталья Владимировна', type: 'вторичка',    vkd: 140000, income: 112000, commission: 80, status: 'paid' },
  { id: 107, agentId: 23, agentName: 'Тарасова Юлия Талгисовна',             date: '2026-05-06', client: 'Краня Ванесса Андреевна',        type: 'аренда',      vkd: 55000,  income: 44000,  commission: 80, status: 'paid' },
  { id: 108, agentId: 26, agentName: 'Лекарева Ольга Александровна',         date: '2026-05-07', client: 'Мамон Камила Андреевна',         type: 'вторичка',    vkd: 75000,  income: 60000,  commission: 80, status: 'paid' },
  { id: 109, agentId: 15, agentName: 'Колесникова Анна Викторовна',          date: '2026-05-07', client: 'Смирнова Елена Владимировна',    type: 'аренда',      vkd: 45000,  income: 36000,  commission: 80, status: 'paid' },
  { id: 110, agentId: 18, agentName: 'Шадрина Ольга Юрьевна',                date: '2026-05-07', client: 'Крылова Надежда Владимировна',   type: 'вторичка',    vkd: 80000,  income: 64000,  commission: 80, status: 'paid' },
  { id: 111, agentId: 12, agentName: 'Шкепу Ольга Вячеславовна',             date: '2026-05-07', client: 'Азаргаева Эльвира Владимировна', type: 'вторичка',    vkd: 255000, income: 204000, commission: 80, status: 'paid' },
  { id: 112, agentId: 17, agentName: 'Семенов Роман Германович',             date: '2026-05-07', client: 'Богинская Ирина Сергеевна',      type: 'новостройка', vkd: 143040, income: 114432, commission: 80, status: 'paid' },
  { id: 113, agentId: 15, agentName: 'Колесникова Анна Викторовна',          date: '2026-05-07', client: 'Смирнова Елена Владимировна',    type: 'новостройка', vkd: 106861, income: 85489,  commission: 80, status: 'paid' },
  { id: 114, agentId: 28, agentName: 'Левчук Ольга Владимировна',            date: '2026-05-07', client: 'Гарнис Светлана Александровна',  type: 'вторичка',    vkd: 60000,  income: 48000,  commission: 80, status: 'paid' },
  { id: 115, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-08', client: 'Булычева Ирина Вячеславовна',    type: 'вторичка',    vkd: 200000, income: 160000, commission: 80, status: 'paid' },
  { id: 116, agentId: 13, agentName: 'Фрикацел (Зернов) Альберт Юрьевич',    date: '2026-05-08', client: 'Трундаев Михаил Михайлович',     type: 'вторичка',    vkd: 253500, income: 228150, commission: 90, status: 'paid' },
  { id: 117, agentId: 24, agentName: 'Гайниденова Миргуль Сетботаловна',     date: '2026-05-08', client: 'Самохвалова Светлана Анатольевна', type: 'вторичка',  vkd: 90250,  income: 72200,  commission: 80, status: 'paid' },
  { id: 118, agentId: 6,  agentName: 'Хавалджи Виталий Васильевич',          date: '2026-05-08', client: 'Гайдамака Наталья Васильевна',   type: 'новостройка', vkd: 199541, income: 159633, commission: 80, status: 'paid' },
  { id: 119, agentId: 6,  agentName: 'Хавалджи Виталий Васильевич',          date: '2026-05-08', client: 'Гайдамака Наталья Васильевна',   type: 'новостройка', vkd: 199542, income: 159634, commission: 80, status: 'paid' },
  { id: 120, agentId: 11, agentName: 'Ключникова Елена Владимировна',        date: '2026-05-08', client: 'Китаева Галина Александровна',   type: 'новостройка', vkd: 264800, income: 211840, commission: 80, status: 'paid' },
  { id: 121, agentId: 7,  agentName: 'Курбанова Галина Николаевна',          date: '2026-05-08', client: 'Ключникова Елена Владимировна',  type: 'новостройка', vkd: 394500, income: 315600, commission: 80, status: 'paid' },
  { id: 122, agentId: 15, agentName: 'Колесникова Анна Викторовна',          date: '2026-05-12', client: 'Смирнова Елена Владимировна',    type: 'аренда',      vkd: 51000,  income: 40800,  commission: 80, status: 'paid' },
  { id: 123, agentId: 32, agentName: 'Алтабасова Майя Тагировна',            date: '2026-05-12', client: 'Дмитриева Екатерина Валерьевна', type: 'аренда',      vkd: 15000,  income: 12000,  commission: 80, status: 'paid' },
  { id: 124, agentId: 30, agentName: 'Терентьев Сергей Иванович',            date: '2026-05-12', client: 'Храмова Наталья Николаевна',     type: 'вторичка',    vkd: 30000,  income: 24000,  commission: 80, status: 'paid' },
  { id: 125, agentId: 3,  agentName: 'Соколенко Елена Николаевна',           date: '2026-05-12', client: 'Пономарёва Наталья Леонидовна',  type: 'вторичка',    vkd: 150000, income: 120000, commission: 80, status: 'paid' },
  { id: 126, agentId: 18, agentName: 'Шадрина Ольга Юрьевна',                date: '2026-05-15', client: 'Шашков Петр Александрович',      type: 'вторичка',    vkd: 10000,  income: 8000,   commission: 80, status: 'paid' },
  { id: 128, agentId: 31, agentName: 'Карьгина Ольга Юрьевна',               date: '2026-05-15', client: 'Пенкина Дарья Сергеевна',        type: 'аренда',      vkd: 20000,  income: 16000,  commission: 80, status: 'paid' },
  { id: 129, agentId: 21, agentName: 'Кузин Дмитрий Владимирович',           date: '2026-05-15', client: 'Криворотько Екатерина Сергеевна', type: 'аренда',     vkd: 24000,  income: 19200,  commission: 80, status: 'paid' },
  { id: 130, agentId: 21, agentName: 'Кузин Дмитрий Владимирович',           date: '2026-05-15', client: 'Криворотько Екатерина Сергеевна', type: 'аренда',     vkd: 11500,  income: 9200,   commission: 80, status: 'paid' },
  { id: 131, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-15', client: 'Булычева Ирина Вячеславовна',    type: 'вторичка',    vkd: 200000, income: 160000, commission: 80, status: 'paid' },
  { id: 132, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-15', client: 'Булычева Ирина Вячеславовна',    type: 'вторичка',    vkd: 200000, income: 180000, commission: 90, status: 'paid' },
  { id: 133, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-15', client: 'Булычева Ирина Вячеславовна',    type: 'вторичка',    vkd: 200000, income: 180000, commission: 90, status: 'paid' },
  { id: 134, agentId: 25, agentName: 'Богинская Ирина Сергеевна',            date: '2026-05-15', client: 'Мамалимова Ирина Сергеевна',     type: 'вторичка',    vkd: 81000,  income: 64800,  commission: 80, status: 'paid' },
  { id: 135, agentId: 27, agentName: 'Храмова Наталья Николаевна',           date: '2026-05-15', client: 'Динова Мария Вадимовна',         type: 'вторичка',    vkd: 70000,  income: 56000,  commission: 80, status: 'paid' },
  { id: 136, agentId: 4,  agentName: 'Удачина Наталья Павловна',             date: '2026-05-15', client: 'Арутюнова Элона Суреновна',      type: 'новостройка', vkd: 574910, income: 459928, commission: 80, status: 'paid' },
  { id: 137, agentId: 21, agentName: 'Кузин Дмитрий Владимирович',           date: '2026-05-18', client: 'Криворотько Екатерина Сергеевна', type: 'вторичка',   vkd: 70000,  income: 56000,  commission: 80, status: 'paid' },
  { id: 138, agentId: 5,  agentName: 'Зуфаров Олег Ансарович',               date: '2026-05-18', client: 'Захарова Дарья Дмитриевна',      type: 'вторичка',    vkd: 175000, income: 140000, commission: 80, status: 'paid' },
  { id: 139, agentId: 14, agentName: 'Орехов Вадим Вагидович',               date: '2026-05-18', client: 'Болохова Людмила Павловна',      type: 'вторичка',    vkd: 250000, income: 200000, commission: 80, status: 'paid' },
  { id: 140, agentId: 20, agentName: 'Тохтарова Марина',                     date: '2026-05-19', client: 'Гордиенко Виктория Сергеевна',   type: 'новостройка', vkd: 129786, income: 103829, commission: 80, status: 'paid' },
  { id: 141, agentId: 16, agentName: 'Барышева Наталия',                     date: '2026-05-19', client: 'Комиссарова Марина Валентиновна', type: 'вторичка',   vkd: 180000, income: 144000, commission: 80, status: 'paid' },
  { id: 142, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-19', client: 'Денисова Татьяна Васильевна',    type: 'вторичка',    vkd: 150000, income: 120000, commission: 80, status: 'paid' },
  { id: 143, agentId: 2,  agentName: 'Бондарь Светлана Алексеевна',          date: '2026-05-19', client: 'Денисова Татьяна Васильевна',    type: 'вторичка',    vkd: 150000, income: 120000, commission: 80, status: 'paid' },
  { id: 144, agentId: 10, agentName: 'Заславская Юлия Ефимовна',             date: '2026-05-20', client: 'Золотухин Павел Андреевич',      type: 'вторичка',    vkd: 300000, income: 240000, commission: 80, status: 'paid' },
  { id: 145, agentId: 22, agentName: 'Островская Лилия Леонидовна',          date: '2026-05-20', client: 'Алтабасова Майя Тагировна',      type: 'вторичка',    vkd: 100000, income: 80000,  commission: 80, status: 'paid' },
  { id: 146, agentId: 18, agentName: 'Шадрина Ольга Юрьевна',                date: '2026-05-20', client: 'Шашков Петр Александрович',      type: 'аренда',      vkd: 38000,  income: 30400,  commission: 80, status: 'paid' },
];

// ============================================================
// Aggregates by MLM team level — used in Team page and dashboard
// (placed AFTER teamDeals so it can reference it at module load)
// ============================================================
function buildTeamLevelStats() {
  const stats = MARKETING_PLAN.map(p => ({
    ...p,
    count: 0,
    activeCount: 0,
    withDealCount: 0,
    totalVkd: 0,
    totalIncome: 0,
  }));
  const dealsByAgent = new Map<number, { vkd: number; income: number; deals: number }>();
  teamDeals.forEach(d => {
    const cur = dealsByAgent.get(d.agentId) || { vkd: 0, income: 0, deals: 0 };
    cur.vkd += d.vkd; cur.income += d.income; cur.deals += 1;
    dealsByAgent.set(d.agentId, cur);
  });
  teamAgents.forEach(a => {
    const idx = a.teamLevel - 1;
    if (idx < 0 || idx >= stats.length) return;
    const s = stats[idx];
    s.count += 1;
    if (a.status === 'active') s.activeCount += 1;
    const da = dealsByAgent.get(a.id);
    if (da) {
      s.withDealCount += 1;
      s.totalVkd += da.vkd;
      s.totalIncome += da.income;
    }
  });
  return stats;
}

export const teamLevelStats = buildTeamLevelStats();

/** Сколько на 1-м уровне команды агентов с хотя бы одной сделкой */
export const l1AgentsWithDeals = teamLevelStats[0]?.withDealCount || 0;

/** Возвращает данные пассивного дохода для каждого уровня MLM */
export function computeTeamIncome() {
  return teamLevelStats.map(stats => {
    const plan = MARKETING_PLAN[stats.level - 1];
    const growingUnlocked = plan.required === null
      ? true
      : l1AgentsWithDeals >= plan.required;

    const effectivePct = plan.protected + (growingUnlocked && plan.growing ? plan.growing : 0);
    const rawIncome = Math.round(stats.totalVkd * effectivePct / 100);
    const capPerAgent = plan.capPerAgent;
    const cappedIncome = Math.min(rawIncome, stats.withDealCount * capPerAgent);

    return {
      ...stats,
      growingUnlocked,
      effectivePct,
      rawIncome,
      cappedIncome,
    };
  });
}
