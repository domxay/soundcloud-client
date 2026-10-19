# План глубокой переработки SoundCloud Desktop в полную веб-копию (SoundCloud Web 2026 Parity)

## Важное системное ограничение
- **Приложение не закрывать:** текущий запущенный экземпляр `SoundCloud Desktop.exe` продолжает воспроизводить музыку. Никакие команды остановки процессов (`Stop-Process`, `taskkill`) не выполняются.
- **Ноль комментариев:** во всех новых и изменённых файлах (`src/`, `electron/`) строго 0 комментариев (`//`, `/*`, `*`).

---

## 1. Таблица ключевых расхождений (Audit)

| Область | Текущее состояние | Веб SoundCloud (2026) | План действий |
|---|---|---|---|
| **Навигация** | Табы: `Home \| Stream \| Library \| Playlists \| Likes \| Downloads \| Profile` | `Home \| Feed \| Library` + поиск + Upload + Auth + Аватар-меню | Замена Header на веб-структуру, перенос подразделов в Library и меню |
| **Роутинг** | `useState(activeTab)` | URL роуты через `react-router-dom` | Внедрение `HashRouter` (для надёжности в Electron), страницы `/`, `/feed`, `/library/*`, `/search`, `/tracks/:id`, `/:username` |
| **Плеер** | Базовый `PlayerBar` внизу | MiniPlayer со шторкой очереди («Next up»), shuffle, repeat (off/one/all), громкость | Переработка плеера под точный UI веба + выдвижная панель `QueuePanel` |
| **Очередь** | Привязана к текущему массиву | Независимый сервис очереди с историей, «Play next», «Add to queue» | Сервис `QueueService` (`src/services/queue.ts`) |
| **Страница трека** | Отсутствует | `/tracks/:id` с крупной обложкой, waveform, статистикой, комментариями, related | Создание `TrackPage` |
| **Страница профиля** | Простой `ProfileView` | Полноценный профиль с обложкой, аватаром, вкладками (Tracks, Playlists, Reposts, Likes), кнопкой Follow | Обновление `ProfileView` под веб-дизайн |
| **Дизайн-токены** | Смесь стилей с акцентом Tokyo Red | Базовая тёмная тема SoundCloud (`#121212`, акцент `#ff5500`), поверхности `#1a1a1a` | Создание `src/design-tokens.css` и подключение к Tailwind |
| **Desktop-фичи** | В модалках на главной | Сохранены, но вынесены в `Settings` (Appearance, Network, Downloads) | Страница / модалка `Settings` |

---

## 2. Фазы выполнения

### Фаза 0: Подготовка зависимостей и дизайн-токенов
1. Установка `react-router-dom`, `clsx`, `tailwind-merge`.
2. Создание `src/design-tokens.css` с официальными CSS переменными SoundCloud (цвета фона, поверхностей, акцентов, радиусов, шрифтов).
3. Создание `src/services/queue.ts` (`QueueService`).
4. Создание хука `src/hooks/useInfiniteList.ts`.
5. Проверка типов: `npm run typecheck`.

### Фаза 1: Роутинг и базовый каркас (Layout)
1. Внедрение `HashRouter` в `src/App.tsx`.
2. Создание `src/layouts/MainLayout.tsx` (Header + Page Outlet + MiniPlayer + Modals).
3. Создание страниц-заглушек для всех роутов (`/`, `/feed`, `/library`, `/search`, `/tracks/:id`, `/:username`, `/settings`, `/downloads`).
4. Обновление `src/components/Header.tsx` под точную структуру soundcloud.com.
5. Проверка сборки: `npm run build`.

### Фаза 2: Базовые UI-компоненты веб-дизайна
1. `src/components/ui/Button.tsx` (Primary, Secondary, Ghost).
2. `src/components/ui/TrackRow.tsx` (строка трека 56px с hover play, номерами, длительностью, лайком).
3. `src/components/ui/TrackCard.tsx` (квадратная карточка с обложкой и play-кнопкой).
4. `src/components/ui/Skeleton.tsx` (shimmer-анимации).
5. `src/components/ui/Tabs.tsx` (вкладки с оранжевым индикатором).
6. `src/components/ui/EmptyState.tsx`, `ErrorState.tsx`.

### Фаза 3: MiniPlayer + Очередь («Next up»)
1. Переработка плеера в `src/components/MiniPlayer.tsx` в стиле веб-клиента.
2. Панель очереди `QueuePanel.tsx` (открытие справа/снизу, очистка, удаление, переход к треку).
3. Интеграция с Media Session API (системные контролы Windows) и шорткатами (Space, стрелки, M).

### Фаза 4: Главная страница (Home / Discover)
1. Секции ленты рекомендаций: «Hear what's trending», «Curated playlists & mixes», «Fresh releases».
2. Бесконечная подгрузка трендов.
3. Карточки в стиле веба без лишних элементов.

### Фаза 5: Страница трека (TrackPage) + Waveform + Комментарии
1. Компонент страницы `/tracks/:id`.
2. Рендеринг двухцветного интерактивного вейвформа (76 баров) с пинами комментариев.
3. Полноценная ветка комментариев с привязкой ко времени и отправкой.
4. Блок похожих треков (Related tracks).

### Фаза 6: Лента (Feed)
1. Роут `/feed`: хронологическая лента треков с группировкой по датам.
2. Waveform-превью треков в ленте.

### Фаза 7: Библиотека (Library)
1. Роут `/library` с подразделами: Overview, Playlists, Likes, History, Downloads.
2. Сетка плейлистов и список понравившихся треков с быстрым поиском.

### Фаза 8: Страница плейлиста (PlaylistPage)
1. Роут `/:username/sets/:slug` или `/playlists/:id`.
2. Заголовок альбома/сета, список треков с номерами, длительностью и 1-клик воспроизведением.

### Фаза 9: Профиль пользователя / артиста (Profile)
1. Шапка профиля с аватаром, статистикой, кнопками Follow / Share.
2. Вкладки: Tracks, Playlists, Reposts, Likes.

### Фаза 10: Полноценный поиск (SearchResults)
1. Роут `/search?q=...`.
2. Вкладки: Tracks, People, Playlists.

### Фаза 11: Настройки (Settings)
1. Роут или центральное окно `/settings`:
   - Appearance: выбор из 11 тем, кастомные фоны.
   - Network: статус DoH, прокси (Clash Verge, v2ray, ByeDPI, Tor) с 1-click автоопределением.
   - Downloads: папка загрузок, качество.
   - Account: профиль, сессия, выход.

### Фаза 12: Финальная полировка и приёмка
1. Skeleton-состояния при загрузке данных.
2. Аудит на отсутствие комментариев.
3. Запуск `npm run typecheck` и `npm run build`.
