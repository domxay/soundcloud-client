# PROMPT: Переработка SoundCloud Desktop Client в точную веб-копию SoundCloud (pixel-perfect + full functional parity)

> **Как использовать:** скопируй этот файл целиком в начало новой задачи для AI-агента / разработчика. Работай строго по фазам, не пропуская критерии приёмки. Сохраняй существующие desktop-преимущества (обход блокировок, загрузчик, темы, фоны, караоке-текст, кастомные окна), если они не конфликтуют с веб-парадигмой; при конфликте — выноси в Settings/Advanced.

---

## 0. Роль и цель

Ты — **senior frontend/fullstack инженер** (React 18 + TypeScript + Electron + Tailwind + Vite). Твоя задача — **полностью переработать данный проект** так, чтобы:

1. **Визуально** он был **неотличим** от `https://soundcloud.com` (актуальная версия 2026): цвета, типографика, отступы, карточки, hover-состояния, иконки, анимации, responsive-поведение.
2. **Функционально** повторял веб-сайт: навигация, поиск, лента, трек-страница, плейлисты, профили, лайки/репосты/комментарии, очередь воспроизведения, shuffle/repeat/volume, бесконечный скролл, пагинация, состояния загрузки/ошибок/пустоты.
3. Сохранял **desktop-преимущества** проекта: frameless-окно, обход блокировок (DoH/SOCKS5/HTTP прокси), загрузчик треков/плейлистов, 11 тем + кастомные фоны, караоке-тексты (LRCLIB), waveform-комментарии, глобальный кэш лайков.

**Источник истины:** живой сайт `https://soundcloud.com` + захваченные сетевые запросы `resources/requests.txt` + текущий код. При любом расхождении между «красиво» и «как на сайте» — выбирай **как на сайте**.

---

## 1. Технический стек (не менять без причины)

- Runtime: Electron 44, Node.js
- Frontend: React 18, TypeScript (strict), Vite 5
- Styling: Tailwind CSS 3 + CSS custom properties
- Audio: HLS.js 1.7, HTML5 Audio, Web Audio API
- Icons: lucide-react
- Lyrics: LRCLIB
- Router: **добавить** `react-router-dom` v6 (или эквивалент) — сейчас навигация через state, это не масштабируется.

**Запрещено:** переписывать на Next.js/Remix, менять сборщик, отказываться от Electron.

---

## 2. Аудит текущего состояния (что сломано/отличается)

Перед кодом составь таблицу расхождений. Обязательные пункты:

### 2.1 Навигация
- Сейчас: tabs `Home | Stream | Library | Playlists | Likes | Downloads | Profile` в `Header.tsx`.
- На вебе: `Home | Feed | Library` + поиск + `Upload` + `Sign in/Create account` + аватар-меню + `Settings and more`.
- **Действие:** привести к веб-навигации. `Stream`→`Feed`, `Playlists`/`Likes` уходят в `Library` (подразделы), `Downloads` — в `Library` или отдельный пункт `Downloads` в меню, `Profile` — в аватар-меню.

### 2.2 Маршрутизация
- Сейчас state-based (`activeTab`).
- Нужно: URL-роуты как на вебе: `/`, `/feed`, `/search?q=`, `/tracks/:id`, `/:username`, `/:username/tracks`, `/:username/sets/:slug`, `/you/library`, `/you/likes`, `/you/playlists`, `/upload`, `/settings`, `/notifications` (опц.).

### 2.3 Плеер
- Сейчас: `PlayerBar` фиксированный внизу, но без очереди, без «Next up», без shuffle/repeat UI как на вебе? (shuffle/repeat есть в state, но UI нужно сверить).
- На вебе: miniplayer внизу с `Next up`/`Clear`/`Hide queue`, `Skip to previous`, `Play current`, `Skip to next`, `Shuffle`, `Repeat track`, `Volume` slider, прогресс-бар с seek, название трека/артист/обложка, like/repost/share/more.
- **Действие:** переписать `PlayerBar` под веб-miniplayer + выдвижная панель очереди.

### 2.4 Очередь воспроизведения
- Сейчас: очередь = текущий `tracks` массив, next/prev по нему.
- На вебе: очередь независима от просматриваемого списка; «Play next», «Add to queue», «Clear queue».
- **Действие:** ввести `QueueService` (очередь, история, shuffle-индекс, repeat mode: off/one/all).

### 2.5 Страница трека
- Сейчас отсутствует отдельная страница трека; трек играет из списка.
- На вебе: `/tracks/:id` с обложкой, заголовком, артистом, waveform, play, like, repost, share, download (Go+), more, комментарии с таймстампами, related tracks, статистика (plays, likes, reposts, comments).
- **Действие:** создать `TrackPage`.

### 2.6 Профиль артиста/пользователя
- Сейчас: `ProfileView` минимальный.
- На вебе: шапка с обложкой/аватаром, имя, верификация, статистика, кнопки Follow/Message/Share, вкладки Tracks/Playlists/Reposts/Likes/Followers/Following, бесконечный скролл.
- **Действие:** переписать `ProfileView` + `ArtistHeader`.

### 2.7 Плейлисты/сеты
- Сейчас: `PlaylistsView` + `PlaylistHero` + `TrackList`.
- На вебе: страница сета с обложкой, описание, треки с номерами, play all, like, repost, share, edit (для владельца), добавление треков.
- **Действие:** переписать.

### 2.8 Поиск
- Сейчас: `handleSearch` → список треков.
- На вебе: вкладки `Tracks | People | Playlists | Albums | Podcasts`? (актуально: Tracks, People, Playlists, Albums), фильтры, сортировка.
- **Действие:** `SearchResultsPage` с вкладками.

### 2.9 Лента (Feed)
- Сейчас: «Stream» = история прослушиваний/тренды.
- На вебе: `/feed` = новые треки от подписок + рекомендации, группировка по датам (Today, Yesterday, ...), карточки с обложкой, waveform-превью, play.
- **Действие:** переписать `Stream`→`Feed`.

### 2.10 Библиотека (Library)
- Сейчас: `LibraryView`.
- На вебе: `/you/library` с вкладками `Playlists | Albums | Stations | Likes | History | Downloads?`, поиск по библиотеке, сортировка.
- **Действие:** переписать.

### 2.11 Комментарии
- Сейчас: `CommentsModal` с локальным кэшем.
- На вебе: комментарии на waveform (пины) + список под треком, ответы (threads), лайки комментариев, удаление своих.
- **Действие:** `CommentThread` компонент, интеграция с `getTrackComments`, `postTrackComment`, ответы.

### 2.12 Лайки/репосты
- Сейчас: только лайки (локальный кэш + PUT/DELETE).
- На вебе: like + repost + «Add to playlist».
- **Действие:** добавить repost API (`/tracks/:id/reposts` PUT/DELETE), оптимистичные обновления, счётчики.

### 2.13 Пагинация
- Сейчас: фиксированные limit 30/40/50, без `next_href`.
- На вебе: бесконечный скролл через `next_href`/`cursor`.
- **Действие:** ввести `useInfiniteQuery`-подобный хук (или свой) для всех списков.

### 2.14 Состояния
- Сейчас: лоадеры текстом, нет skeleton.
- На вебе: skeleton-карточки, пустые состояния с CTA, ошибки с retry.
- **Действие:** `Skeleton`, `EmptyState`, `ErrorState`.

### 2.15 Стили/токены
- Сейчас: кастомная тема Tokyo Red (`#ff0055`) по умолчанию.
- На вебе: базовая тёмная тема SoundCloud (акцент `#ff5500` оранжевый, фон `#121212`/`#1a1a1a`, поверхности `#222`/`#2a2a2a`, текст `#fff`/`#999`/`#666`).
- **Действие:** сделать веб-тему дефолтной; кастомные 11 тем перенести в `Settings → Appearance` как «Custom themes» (опционально), не ломать дефолт.

### 2.16 Типографика
- Сейчас: Inter.
- На вебе: `Inter`? SoundCloud web использует `Inter`/system. Оставить Inter, но размеры/веса сверить (12-14px база, заголовки 20-32px).

### 2.17 Иконки
- Сейчас: lucide.
- На вебе: собственные SVG-иконки (play, pause, like heart, repost, share, more, shuffle, repeat, volume, skip).
- **Действие:** можно оставить lucide, но подобрать визуально близкие; для точности — вынести SVG-спрайт из веба (DevTools → Elements) в `src/assets/icons/`. Предпочтительнее точные SVG.

### 2.18 Загрузчик
- Веба нет, но desktop-фича. Оставить в `Library → Downloads` или меню. UI — как на вебе? Сделать в стиле веб-карточек.

### 2.19 Обход блокировок / темы / фоны
- Сохранить, но вынести в `Settings → Network` и `Settings → Appearance`. Не показывать на главной.

---

## 3. Детальный план реализации (фазы)

Работай **строго по фазам**. Каждая фаза заканчивается: `npm run typecheck` + `npm run build` + ручная проверка + коммит.

### Фаза 0 — Подготовка (0.5 дня)
1. Установить `react-router-dom`, `@tanstack/react-query` (опц., для пагинации/кэша), `clsx`, `tailwind-merge`.
2. Создать `src/design-tokens.css` с веб-токенами SoundCloud (см. раздел 4).
3. Настроить ESLint/Prettier (уже есть).
4. Добавить `src/services/queue.ts` (QueueService).
5. Добавить `src/hooks/useInfiniteList.ts`.

### Фаза 1 — Каркас и роутинг (1 день)
1. Обернуть `App` в `BrowserRouter`.
2. Создать `src/layouts/MainLayout.tsx`: Header + Outlet + MiniPlayer + global toasts/modals.
3. Маршруты:
   - `/` → Home
   - `/feed` → Feed
   - `/library` → Library (с подмаршрутами `/library/playlists`, `/library/likes`, `/library/history`)
   - `/search` → SearchResults
   - `/tracks/:id` → TrackPage
   - `/:username` → Profile
   - `/:username/tracks` → ProfileTracks
   - `/:username/sets/:slug` → PlaylistPage
   - `/upload` → Upload (опц.)
   - `/settings` → Settings
   - `/downloads` → Downloads
4. Header: обновить навигацию под веб (Home/Feed/Library + Search + Upload + Auth + Settings).

### Фаза 2 — Дизайн-токены и базовые UI-компоненты (1 день)
Реализовать (см. раздел 5): `Button`, `IconButton`, `Card`, `TrackRow`, `TrackCard`, `Skeleton`, `EmptyState`, `ErrorState`, `Avatar`, `Tabs`, `Dropdown`, `Modal`, `Tooltip`, `InfiniteScroll`.

### Фаза 3 — MiniPlayer + Queue (1.5 дня)
1. Переписать `PlayerBar` → `MiniPlayer` (веб-стиль).
2. Панель очереди (`QueuePanel`) с drag-to-reorder (опц.), remove, clear.
3. QueueService: add, addNext, remove, clear, next, prev, shuffle toggle, repeat cycle.
4. Media Session API: play/pause/next/prev/seek, метаданные (title, artist, artwork).
5. Клавиатурные шорткаты: Space, ←/→ (seek 5s), Shift+←/→ (prev/next), M (mute), ↑/↓ (volume).

### Фаза 4 — Home / Discover (1 день)
1. Hero-баннер «DISCOVER. GET DISCOVERED.»? На вебе для неавторизованных — лендинг. Для авторизованных — лента рекомендаций.
2. Секции: «Hear what's trending» (список треков), «Explore trending playlists», «Never stop listening» (app promo).
3. Карточки треков как на вебе: обложка слева? На вебе — список с waveform-превью? Упростить: карточка с обложкой, название, артист, play на hover, длительность, plays.
4. Бесконечный скролл трендов.

### Фаза 5 — TrackPage + Waveform + Comments (2 дня)
1. Страница трека: обложка large, заголовок, артист (ссылка), дата, жанр, статистика (plays/likes/reposts/comments), waveform (dual-tone), play/pause, like, repost, share, more (download, add to playlist, copy link), комментарии.
2. Waveform: использовать `waveform_url` → `fetchWaveformData`, рендер 76 баров, прогресс, клик seek, пины комментариев с аватарами и tooltip.
3. Комментарии: список с аватарами, временем, текстом, ответами; форма отправки с привязкой к текущему времени; quick-reply chips; seek при клике на таймстамп.
4. Related tracks (поиск по артисту/жанру).

### Фаза 6 — Feed (1 день)
1. `/feed`: группировка по датам, карточки треков с waveform-превью, play, like, repost, комментарий, «Show more».
2. Пагинация `next_href`.
3. Для неавторизованных — CTA «Join SoundCloud».

### Фаза 7 — Library (1 день)
1. Вкладки: Playlists, Albums, Stations, Likes, History, Downloads (desktop).
2. Сетки карточек плейлистов (как на вебе: квадратная обложка, название, кол-во треков, артист).
3. Поиск по библиотеке (клиентский фильтр).
4. Сортировка (недавние/название/дата).

### Фаза 8 — PlaylistPage (1 день)
1. Обложка, название, описание, артист, кол-во треков, длительность, play all, shuffle, like, repost, share, edit (owner), добавление треков.
2. Список треков с номерами, обложками, длительностью, plays, like.
3. Drag-to-reorder (owner).

### Фаза 9 — Profile (1.5 дня)
1. Шапка: cover image (опц.), аватар, имя, верификация, локация, статистика (tracks/playlists/followers/following), bio, кнопки Follow/Message/Share/More.
2. Вкладки: Tracks, Playlists, Reposts, Likes, Followers, Following.
3. Бесконечный скролл.
4. Follow/unfollow API (`/users/:id/followings/:id` PUT/DELETE).

### Фаза 10 — SearchResults (1 день)
1. Поиск-инпут в header (как сейчас) + страница результатов.
2. Вкладки: Tracks, People, Playlists, Albums.
3. Каждая — бесконечный скролл.
4. Подсветка запроса (опц.).

### Фаза 11 — Upload + Settings (1.5 дня)
1. Upload: форма загрузки (title, genre, tags, privacy, artwork, file). Использовать SoundCloud Upload API? Сложно; можно оставить как «открыть веб-загрузку в браузере» (shell.openExternal) или реализовать через API `/tracks` POST (требует multipart). **Рекомендация:** кнопка Upload открывает `https://soundcloud.com/upload` во внешнем браузере (как делает веб-клиент на мобиле). Desktop-преимущество не теряется.
2. Settings: Account (профиль), Appearance (темы/фоны), Network (DoH/proxy), Playback (качество, autoplay, crossfade), Downloads (папка), Privacy, Notifications, Language.
3. Все настройки сети/тем/фонов перенести сюда.

### Фаза 12 — Полировка (1 день)
1. Skeleton-лоадеры везде.
2. Пустые состояния с CTA.
3. Ошибки с retry.
4. Toasts в стиле веба (снизу по центру? на вебе — bottom center).
5. Анимации: fade-in, slide-up, hover scale.
6. Проверка контрастности, фокус-стилей, a11y.
7. `npm run typecheck`, `npm run build`, `npm run lint`.
8. Ручной чек-лист (раздел 8).

---

## 4. Дизайн-токены (веб SoundCloud 2026)

Создать `src/design-tokens.css` и подключить в `index.css`. Значения — базовая тёмная тема SoundCloud:

```css
:root {
  /* Backgrounds */
  --sc-bg: #121212;            /* основной фон */
  --sc-bg-elevated: #1a1a1a;   /* карточки/поверхности */
  --sc-bg-hover: #2a2a2a;      /* hover */
  --sc-bg-active: #333333;
  --sc-surface: #1e1e1e;
  --sc-surface-2: #242424;

  /* Borders */
  --sc-border: #2a2a2a;
  --sc-border-subtle: #1f1f1f;
  --sc-border-strong: #3a3a3a;

  /* Accent (SoundCloud orange) */
  --sc-accent: #ff5500;
  --sc-accent-hover: #ff6600;
  --sc-accent-active: #e64d00;
  --sc-accent-soft: rgba(255, 85, 0, 0.12);

  /* Text */
  --sc-text-primary: #ffffff;
  --sc-text-secondary: #b3b3b3;
  --sc-text-tertiary: #7c7c7c;
  --sc-text-disabled: #555555;
  --sc-text-on-accent: #ffffff;

  /* Waveform */
  --sc-wave-active: #ff5500;
  --sc-wave-inactive: #3a3a3a;
  --sc-wave-played: #ff5500;
  --sc-wave-buffered: #555555;

  /* Status */
  --sc-success: #1db954;
  --sc-warning: #ffa42b;
  --sc-danger: #ff4d4d;
  --sc-info: #3d9df6;

  /* Radius */
  --sc-radius-xs: 2px;
  --sc-radius-sm: 4px;
  --sc-radius-md: 6px;
  --sc-radius-lg: 8px;
  --sc-radius-xl: 12px;
  --sc-radius-full: 9999px;

  /* Spacing scale (4px) */
  --sc-space-1: 4px;
  --sc-space-2: 8px;
  --sc-space-3: 12px;
  --sc-space-4: 16px;
  --sc-space-5: 20px;
  --sc-space-6: 24px;
  --sc-space-8: 32px;
  --sc-space-10: 40px;
  --sc-space-12: 48px;

  /* Shadows */
  --sc-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --sc-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --sc-shadow-lg: 0 8px 24px rgba(0,0,0,0.5);

  /* Typography */
  --sc-font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --sc-font-mono: 'SF Mono', 'Consolas', monospace;
  --sc-text-xs: 11px;
  --sc-text-sm: 12px;
  --sc-text-base: 14px;
  --sc-text-md: 16px;
  --sc-text-lg: 20px;
  --sc-text-xl: 24px;
  --sc-text-2xl: 32px;

  /* Z-index */
  --sc-z-header: 40;
  --sc-z-miniplayer: 50;
  --sc-z-modal: 60;
  --sc-z-toast: 70;
  --sc-z-tooltip: 80;

  /* Layout */
  --sc-header-height: 56px;
  --sc-miniplayer-height: 72px;
  --sc-container-max: 1280px;
  --sc-sidebar-width: 0; /* веб не использует sidebar */
}
```

**Tailwind config:** расширить `colors`/`borderRadius`/`fontFamily` под эти токены, чтобы использовать `bg-sc-bg`, `text-sc-text-primary` и т.д. (уже частично есть).

**Важно:** кастомные 11 тем оставить, но применять через класс `.theme-*` на `<html>`, перекрывая токены. Дефолт = веб-тема (без класса).

---

## 5. Базовые UI-компоненты (спеки)

Создать в `src/components/ui/`:

- `Button`: variants `primary` (accent), `secondary` (surface+border), `ghost`, `danger`; sizes `sm/md/lg`; states loading/disabled; icon slots.
- `IconButton`: квадратная кнопка с иконкой, tooltip.
- `Card`: поверхность + border + radius + hover.
- `TrackRow`: строка трека (номер/обложка 40px/название+артист/альбом?/длительность/plays/like). Высота ~56px. Hover → play overlay на обложке.
- `TrackCard`: квадратная карточка (обложка + название + артист + play на hover).
- `Avatar`: размеры 24/32/40/56/80/120, fallback инициал.
- `Tabs`: горизонтальные вкладки как на вебе (underline accent).
- `Dropdown`: меню с иконками, разделителями, danger-пункты.
- `Modal`: центрированный, backdrop blur, close по Esc/клик вне, размеры sm/md/lg/xl.
- `Tooltip`: hover/focus, задержка 400ms.
- `Skeleton`: shimmer-анимация.
- `EmptyState`: иконка + заголовок + описание + CTA.
- `ErrorState`: иконка + сообщение + retry.
- `InfiniteScroll`: IntersectionObserver, триггер на 200px до конца, spinner.
- `Badge`: счётчики, «Pro», «Verified».
- `Waveform`: отдельный компонент (см. Фаза 5).

**Правило:** никаких inline-стилей кроме динамических значений (progress %). Всё через Tailwind-классы/токены.

---

## 6. Сервисы и хуки (расширения)

### 6.1 `QueueService` (`src/services/queue.ts`)
```ts
interface QueueState {
  items: Track[];
  currentIndex: number;
  history: number[]; // track ids
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  originalOrder: Track[]; // для shuffle restore
}
```
Методы: `play(track, list?)`, `enqueue(track)`, `enqueueNext(track)`, `remove(index)`, `clear()`, `next()`, `prev()`, `setShuffle(bool)`, `cycleRepeat()`, `subscribe`.

### 6.2 `useInfiniteList<T>` (`src/hooks/useInfiniteList.ts`)
Принимает fetcher `(cursor?) => Promise<{items, nextCursor}>`. Возвращает `{items, loading, loadingMore, error, hasMore, loadMore, refresh}`. Использует `next_href` парсинг.

### 6.3 API-расширения (`src/services/api.ts`)
Добавить:
- `getTrack(id)` → `/tracks/:id`
- `getReposts(userId)` → `/users/:id/reposts`
- `toggleRepost(trackId, isRepost)` → `/tracks/:id/reposts` PUT/DELETE
- `followUser(userId)` / `unfollowUser(userId)` → `/users/:id/followings/:id` PUT/DELETE
- `getUserFollowers(userId)`, `getUserFollowings(userId)`
- `getUserTracks(userId)`, `getUserPlaylists(userId)` (уже есть)
- `getAlbums(userId)` (опц.)
- `getFeed(cursor)` → `/me/feed` или `/stream` (SoundCloud: `/me/activities`? актуально `/me/feed`? Использовать `/me/play-history` как fallback; основной — `/me/feed`? Проверить по requests.txt / DevTools. Если не работает — `/activities`.)
- `getTrackRelated(trackId)` → `/tracks/:id/related`
- `addToPlaylist(playlistId, trackId)` → `/playlists/:id/tracks` POST
- `removeFromPlaylist(playlistId, trackId)` → DELETE
- `createPlaylist(title, tracks)` → POST `/playlists`
- `updatePlaylist(id, data)` → PUT
- `deletePlaylist(id)` → DELETE
- `getNotifications` (опц.)
- Парсинг `next_href` во всех списках.

**Правило:** каждый метод возвращает нормализованные данные + `nextCursor` (из `next_href`).

### 6.4 `auth.ts`
- Сохранить OAuth-flow.
- Добавить `refreshToken`? SoundCloud JWT имеет exp ~24h. При 401 — попытаться переоткрыть логин? Минимум: при 401 очищать сессию и показывать «Session expired».

---

## 7. Правила кода и процесса

1. **TypeScript strict:** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — уже включены? Проверить tsconfig. Добавить если нет.
2. **Компоненты ≤ 300 строк.** Большие — разбивать.
3. **Один компонент — одна ответственность.**
4. **Не дублировать fetch-логику:** только через `soundcloudApi`.
5. **Состояния:** локальный `useState` для UI, глобальный — через сервисы/React Query. Избегать prop drilling > 2 уровней (Context для player/queue/theme).
6. **Импорты:** alias `@/`.
7. **Коммиты:** `feat:`, `fix:`, `refactor:`, `style:`, `chore:`.
8. **Не удалять функции без замены.** Если удаляешь `Stream` tab — заменяешь на `Feed` route.
9. **Тесты:** добавить Vitest + React Testing Library для утилит и ключевых компонентов (опц., но желательно).
10. **Документация:** обновить README (EN/RU) после завершения: новые скриншоты, навигация, горячие клавиши.

---

## 8. Чек-лист приёмки (ручной)

### Визуал
- [ ] Главная неотличима от soundcloud.com (цвета, шрифты, отступы).
- [ ] Header: logo + Home/Feed/Library + Search + Upload + Sign in/Create account + avatar + Settings.
- [ ] MiniPlayer внизу: обложка, title/artist, progress seek, prev/play/next, shuffle, repeat, volume, like, repost, share, more, queue toggle.
- [ ] Карточки треков/плейлистов как на вебе.
- [ ] Skeleton при загрузке, empty/error состояния.

### Функционал
- [ ] Воспроизведение трека (HLS/progressive) работает.
- [ ] Очередь: play next, add to queue, clear, reorder, shuffle, repeat.
- [ ] Like/repost синхронизируются по всему UI.
- [ ] Комментарии: отправка с таймстампом, отображение пинов на waveform, seek.
- [ ] Поиск по трекам/людям/плейлистам.
- [ ] Бесконечный скролл на всех списках.
- [ ] Профиль: follow/unfollow, вкладки.
- [ ] Плейлисты: создание, добавление треков, удаление, reorder.
- [ ] Загрузчик: выбор файла/папки, прогресс, завершение.
- [ ] Обход блокировок: DoH/proxy работают.
- [ ] Темы/фоны: переключение, сохранение.
- [ ] Карaoke-тексты: автоскролл, seek по клику.
- [ ] Горячие клавиши.
- [ ] Media Session (системные контролы).

### Техническое
- [ ] `npm run typecheck` — 0 ошибок.
- [ ] `npm run build` — успех.
- [ ] `npm run lint` — 0 ошибок (warnings допустимы).
- [ ] Нет console errors в DevTools.
- [ ] Размер бандла не вырос > 20% без причины.

---

## 9. Анти-паттерны (не делать)

- Не хардкодить цвета в компонентах — только токены.
- Не использовать `any` без крайней необходимости.
- Не делать fetch в компонентах — только через сервисы.
- Не хранить серверное состояние в localStorage (только лайки/сессия/настройки).
- Не ломать существующие сервисы (audio, auth, downloader, theme) — расширять.
- Не удалять desktop-фичи (загрузчик, прокси, темы) — переносить в Settings.
- Не использовать `window.alert/confirm` — только модалки.

---

## 10. Рекомендуемый порядок PR

1. `chore: add router + design tokens`
2. `feat: main layout + header web parity`
3. `feat: minplayer + queue service`
4. `feat: home/discover web parity`
5. `feat: track page + waveform + comments`
6. `feat: feed`
7. `feat: library`
8. `feat: playlist page`
9. `feat: profile`
10. `feat: search results`
11. `feat: settings (network/appearance/playback/downloads)`
12. `feat: upload (external) + polish`
13. `docs: update READMEs`

---

## 11. Открытые вопросы (уточнить у пользователя)

1. Нужен ли светлый режим (веб SoundCloud поддерживает? проверить Settings → Appearance на сайте). Если да — добавить токены светлой темы.
2. Нужны ли уведомления (notifications) и сообщения (messages)? На вебе есть. Если не нужны — пропустить.
3. Нужна ли загрузка своих треков (Upload) внутри приложения или достаточно открытия веб-страницы?
4. Нужна ли поддержка подкастов/альбомов?
5. Нужен ли скробблинг (Last.fm)?
6. Нужны ли локальные плейлисты (не на сервере) в дополнение к серверным?

> **Рекомендация по умолчанию:** реализовать всё, что есть на вебе для авторизованного пользователя (Home/Feed/Library/Search/Track/Playlist/Profile/Settings), плюс desktop-фичи в Settings. Уведомления/сообщения — опционально (фаза 12+).

---

## 12. Пример стартового сообщения для агента

> «Ты — senior frontend engineer. Переработай проект SoundCloud Desktop Client (React 18 + TS + Electron + Tailwind) в точную веб-копию soundcloud.com. Работай по фазам из PROMPT_REWORK.md. Начни с Фазы 0: установи зависимости, добавь дизайн-токены, создай QueueService и useInfiniteList. Не ломай существующие сервисы. После каждой фазы запускай typecheck + build и коммить. Сначала покажи план файлов, которые создашь/изменишь, и дождись подтверждения.»

---

**Конец промпта.**
path">
C:\Users\sayd\Downloads\projects\project\Tools\soundcloud-client\REWORK_PROMPT.md