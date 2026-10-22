import { useState, useEffect } from 'react';

export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    // Navigation & Global Header
    home: 'Главная',
    library: 'Моя музыка',
    playlists: 'Плейлисты',
    downloads: 'Загрузки',
    feed: 'Лента',
    settings: 'Настройки',
    searchPlaceholder: 'Поиск треков, артистов... (Enter)',
    upload: 'Загрузить',
    login: 'Войти',
    logout: 'Выйти',
    profile: 'Профиль',
    syncCookies: 'Синхронизация',
    syncBrowserCookies: 'Синхронизировать сессию браузера',
    connecting: 'Подключение...',
    connected: 'Подключено',
    directConnection: 'Прямое соединение',
    minimize: 'Свернуть',
    maximize: 'Развернуть',
    close: 'Закрыть',

    // Player Bar & Controls
    play: 'Воспроизведение',
    pause: 'Пауза',
    previous: 'Предыдущий трек',
    next: 'Следующий трек',
    shuffle: 'Перемешать',
    repeatAll: 'Повторять все',
    repeatOne: 'Повторять один',
    repeatOff: 'Без повтора',
    lyrics: 'Текст песни',
    queue: 'Очередь',
    volume: 'Громкость',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    speed: 'Скорость',
    sleepTimer: 'Таймер сна',
    equalizer: 'Эквалайзер',
    equalizerPresets: 'Пресеты эквалайзера',
    equalizerFlat: 'Обычный (Flat)',
    equalizerBass: 'Усиление баса (Bass Boost)',
    equalizerPhonk: 'Фонк и саб-бас (Phonk)',
    equalizerTreble: 'Усиление высоких (Treble)',
    equalizerVocal: 'Четкий вокал (Vocal)',
    equalizerRock: 'Рок и динамика (Rock)',
    timerOff: 'Выкл',
    minShort: 'мин',
    hoursShort: 'ч',
    downloadPlaylistFree: 'Скачать плейлист (Бесплатно)',
    playlistUpper: 'ПЛЕЙЛИСТ',
    updated: 'Обновлено',
    daysAgo: 'дней назад',
    unlike: 'Убрать лайк',
    like: 'Лайк',
    trackLiked: 'Добавлено в любимые',
    trackUnliked: 'Удалено из любимых',
    download: 'Скачать',
    comments: 'Комментарии',
    nowPlaying: 'Сейчас играет',
    upNext: 'Далее в очереди',
    emptyQueue: 'Очередь пуста',
    clearQueue: 'Очистить очередь',

    // Desktop Overlay
    overlayCompact: 'Компактный режим',
    overlayExpanded: 'Развернуть с текстом',
    overlayLyrics: 'Текст песни (Lyrics)',
    overlayShape: 'Сменить форму',
    overlayRestore: 'Развернуть SoundCloud Desktop',
    overlayClose: 'Скрыть оверлей',
    overlayPlaybackStopped: 'Воспроизведение остановлено',
    overlayResizeTip: 'Потяните край для изменения ширины',
    overlayDragTip: 'Зажмите для перемещения',
    overlayScrubTip: 'Перемотка трека',

    // Home View
    trending: 'В тренде сейчас',
    popularTracks: 'Популярные треки',
    recommended: 'Рекомендации для вас',
    discoverNew: 'Откройте для себя новую музыку',
    recentlyPlayed: 'Недавно прослушано',
    charts: 'Чарты SoundCloud',
    top50: 'Топ 50 Чарт SoundCloud',
    top50Subtitle: 'Самые популярные треки мира в реальном времени',
    hotTracks: 'Горячие новинки',
    seeAll: 'Смотреть все',
    playAll: 'Включить все',
    listenEntireChart: 'Слушать весь чарт',
    refreshStream: 'Обновить стрим',
    serverUnavailableTitle: 'Серверы SoundCloud не ответили',
    serverUnavailableDesc: 'В вашем регионе соединение может блокироваться провайдером. Откройте Настройки -> Сеть и Маршрутизация и включите прокси или системный VPN.',
    trendingGlobal: '#1 В МИРОВОМ ТРЕНДЕ',
    playlistsAndMixes: 'Плейлисты и Миксы',
    playlistsSubtitle: 'Кураторские подборки редакции SoundCloud',
    allPlaylists: 'Все плейлисты',
    newReleasesTitle: 'Новые Релизы 2026',
    newReleasesSubtitle: 'Свежие треки, загруженные авторами за последнее время',
    newReleaseTag: 'Новый релиз',
    genresAndCategories: 'Жанры и категории',
    genresSubtitle: 'Быстрое переключение по жанрам',
    loadingChart: 'Загрузка чарта SoundCloud...',
    loadingGenreTracks: 'Загрузка треков...',

    // Library View
    libraryTitle: 'Моя музыка',
    librarySubtitle: 'Ваша личная медиатека: сохраненные плейлисты, любимые треки и история',
    overviewTab: 'Обзор',
    playlistsTab: 'Плейлисты',
    likedTab: 'Понравившиеся',
    historyTab: 'История',
    likedTracks: 'Понравившиеся треки',
    followingArtists: 'Отслеживаемые авторы',
    listeningHistory: 'История прослушиваний',
    noLikedTracks: 'У вас пока нет понравившихся треков',
    noLikedTracksDesc: 'Нажмите на иконку сердечка на любом треке, чтобы добавить его сюда.',
    noHistory: 'История прослушиваний пуста',
    noPlaylists: 'Плейлисты не найдены',
    tracksCount: 'треков',
    backToLibrary: 'Назад в медиатеку',
    curatedBy: 'Создатель:',
    trendingToLike: 'Популярные треки для добавления в избранное',
    featuredPlaylists: 'Избранные и персональные плейлисты',
    viewAll: 'Смотреть все',
    loadingLibrary: 'Загрузка вашей медиатеки SoundCloud...',

    // Downloads View
    downloadsTitle: 'Загрузки и автономный кэш',
    downloadsSubtitle: 'Музыка, сохраненная на вашем компьютере для воспроизведения без интернета',
    openFolder: 'Открыть папку с файлами',
    changeFolder: 'Изменить папку',
    noDownloads: 'Нет скачанных треков',
    noDownloadsDesc: 'Нажмите кнопку скачивания возле любого трека или плейлиста, чтобы сохранить его на диск.',
    downloading: 'Загрузка...',
    downloadComplete: 'Файл сохранен',
    downloadFailed: 'Ошибка скачивания',
    openDownloadsFolder: 'Открыть папку загрузок',

    // Modals & Settings
    themeAndSettings: 'Настройки и темы',
    appearanceAndNetwork: 'Внешний вид и сеть',
    appearanceSubtitle: 'Цветовые темы, живые фоны и маршрутизация сети',
    interfaceLanguage: 'Язык интерфейса',
    chooseLanguage: 'Выберите язык интерфейса приложения',
    languageHint: 'Мгновенное переключение языка интерфейса приложения и оверлея в рантайме',
    themes: 'Цветовые темы',
    customBackground: 'Пользовательский фон (GIF / Видео)',
    proxyAndNetwork: 'Прокси и маршрутизация сети',
    save: 'Сохранить',
    cancel: 'Отмена',
    applied: 'Применено',
    russian: 'Русский',
    english: 'English',
    languageSwitched: 'Язык изменен на Русский',
    builtInBypass: 'Встроенный обход блокировок (Bypass / DoH)',
    systemMode: 'Системный режим',
    backgroundMedia: 'Фоновое медиа',
    backgroundMediaDesc: 'Выберите видео (MP4, WebM), анимацию (GIF) или изображение',
    resetToDefault: 'Сбросить фон',
    chooseFileFromPc: 'Выбрать файл с ПК (GIF, Видео, Картинка)',
    browseFilesPc: 'Обзор файлов на ПК',
    directLinkUrl: 'Прямая ссылка / URL (GIF / MP4 / Картинка)',
    applyUrl: 'Применить ссылку',
    backgroundDimming: 'Затемнение фона',
    backgroundBlur: 'Размытие фона (Blur)',
    bypassTitle: 'Обход блокировок SoundCloud (Режим для РФ без системного VPN)',
    bypassSubtitle: 'Слушайте музыку и скачивайте треки на полной скорости без стороннего VPN',
    autoDetect: 'Авто-поиск',
    searchingProxy: 'Поиск...',
    clientDetected: 'Обнаружен активный клиент',
    connectToProxy: 'Подключить',
    directConnectionMode: 'Прямое подключение к сети',
    resetProxy: 'Сбросить',

    // Auth & Login Modal
    authRequired: 'Для прослушивания музыки войдите в аккаунт SoundCloud',
    loginToSoundCloud: 'Вход в аккаунт SoundCloud',
    loginDescription: 'Для воспроизведения музыки и синхронизации вашей медиатеки',
    browserLogin: 'Войти через аккаунт SoundCloud',
    tokenLogin: 'Ручной ввод токена сессии',
    hideManualLogin: 'Скрыть ручной ввод',
    cookiesSync: 'Синхронизировать сессию браузера',
    tokenPlaceholder: 'OAuth 2-xxxx или JWT токен...',
    applyToken: 'Применить ключ',
    continueWithoutLogin: 'Продолжить без входа',
    loginSuccess: 'Успешный вход в аккаунт',
    logoutSuccess: 'Вы вышли из аккаунта',
    authorizedAs: 'Вы авторизованы как',
    connectionRoute: 'Маршрут подключения',
    loginNotice: 'Воспроизведение треков, плейлисты и синхронизация лайков доступны после входа в ваш профиль SoundCloud.',

    // Lyrics & Comments
    lyricsTitle: 'Синхронизированный текст песни',
    noLyricsAvailable: 'Текст для этого трека пока не найден в базе LRCLIB',
    commentsTitle: 'Комментарии к треку',
    noCommentsYet: 'К этому треку пока нет комментариев',
    writeComment: 'Напишите комментарий...',
    sendComment: 'Отправить',
    tabLyrics: 'Текст песни',
    tabDescription: 'Описание трека',
    tabEditor: 'Свой текст / Редактор',
    syncDelay: 'Задержка синхронизации:',
    resetOffset: 'Сбросить',
    saveUserLyrics: 'Сохранить свой текст',
    userLyricsSaved: 'Пользовательский текст сохранен',

    // Playlists & Curated Mixes
    playlistsViewTitle: 'Плейлисты и кураторские миксы',
    playlistsViewSubtitle: 'Популярные и редакторские подборки SoundCloud в реальном времени',
    refreshPlaylists: 'Обновить',
    backToPlaylists: 'Назад ко всем плейлистам',
    curatedPlaylistBadge: 'Кураторский плейлист',
    noPlaylistsCategory: 'Плейлисты не найдены в выбранной категории.',

    // Track List Headers
    colTitle: 'Название',
    colArtist: 'Исполнитель',
    colDuration: 'Время',
    colPlays: 'Прослушивания',
    colActions: 'Действия',
    noTracksFound: 'Треки не найдены. Попробуйте обновить стрим или проверить статус сети в настройках.',

    // Profile View
    profileTitle: 'ПРОФИЛЬ SOUNDCLOUD',
    followersCount: 'Подписчики',
    followingCount: 'Подписки',
    streamTracksCount: 'Треков в стриме',
    likesCount: 'Лайков',
    openOnWeb: 'Открыть в веб-версии',
    switchAccount: 'Сменить аккаунт',

    // Feed View
    feedTitle: 'Стрим и Лента',
    feedAuthSubtitle: 'Свежие треки от авторов, на которых вы подписаны, и персональные рекомендации.',
    feedGuestSubtitle: 'Прямой стрим популярных новинок от авторов SoundCloud.',
    signInForFeed: 'Войти для персональной ленты',
    refreshFeed: 'Обновить ленту',
    feedEmptyTitle: 'В вашей ленте пока тихо',
    feedEmptyDesc: 'Подпишитесь на авторов или слушайте чарты, чтобы находить новые треки.',

    // Search Results View
    searchResultsFor: 'Результаты поиска по запросу:',
    foundTracks: 'Найдено треков:',
    noSearchResults: 'По запросу ничего не найдено',
    checkSpelling: 'Проверьте правильность написания или попробуйте другое название.',
    tabTracks: 'Треки',
    tabPlaylists: 'Плейлисты',

    // Track Page & Artist View
    backToTracks: 'Назад',
    shareTrack: 'Поделиться',
    relatedTracks: 'Похожие треки',
    artistAbout: 'Об авторе',
    artistTracks: 'Треки автора',
    artistPlaylists: 'Плейлисты автора',
    followArtist: 'Подписаться',
    followingArtist: 'Вы подписаны',
  },
  en: {
    // Navigation & Global Header
    home: 'Home',
    library: 'Library',
    playlists: 'Playlists',
    downloads: 'Downloads',
    feed: 'Feed',
    settings: 'Settings',
    searchPlaceholder: 'Search tracks, artists... (Press Enter)',
    upload: 'Upload',
    login: 'Log In',
    logout: 'Log Out',
    profile: 'Profile',
    syncCookies: 'Sync',
    syncBrowserCookies: 'Sync Browser Session Cookies',
    connecting: 'Connecting...',
    connected: 'Connected',
    directConnection: 'Direct Mode',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',

    // Player Bar & Controls
    play: 'Play',
    pause: 'Pause',
    previous: 'Previous track',
    next: 'Next track',
    shuffle: 'Shuffle',
    repeatAll: 'Repeat all',
    repeatOne: 'Repeat one',
    repeatOff: 'Repeat off',
    lyrics: 'Lyrics',
    queue: 'Queue',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
    speed: 'Playback Speed',
    sleepTimer: 'Sleep Timer',
    equalizer: 'Equalizer',
    equalizerPresets: 'Equalizer Presets',
    equalizerFlat: 'Flat (Standard)',
    equalizerBass: 'Bass Boost',
    equalizerPhonk: 'Phonk & Sub-Bass',
    equalizerTreble: 'Treble Boost',
    equalizerVocal: 'Vocal Clarity',
    equalizerRock: 'Rock & Dynamic',
    timerOff: 'Off',
    minShort: 'min',
    hoursShort: 'hr',
    downloadPlaylistFree: 'Download Playlist (Free)',
    playlistUpper: 'PLAYLIST',
    updated: 'Updated',
    daysAgo: 'days ago',
    unlike: 'Unlike',
    like: 'Like',
    trackLiked: 'Added to favorites',
    trackUnliked: 'Removed from favorites',
    download: 'Download',
    comments: 'Comments',
    nowPlaying: 'Now Playing',
    upNext: 'Up Next',
    emptyQueue: 'Queue is empty',
    clearQueue: 'Clear Queue',

    // Desktop Overlay
    overlayCompact: 'Compact mode',
    overlayExpanded: 'Expand with lyrics',
    overlayLyrics: 'Synchronized Lyrics',
    overlayShape: 'Switch shape',
    overlayRestore: 'Restore SoundCloud Desktop',
    overlayClose: 'Hide overlay',
    overlayPlaybackStopped: 'Playback stopped',
    overlayResizeTip: 'Drag edge to resize overlay',
    overlayDragTip: 'Click & drag to move',
    overlayScrubTip: 'Seek audio track',

    // Home View
    trending: 'Trending Now',
    popularTracks: 'Popular Tracks',
    recommended: 'Recommended For You',
    discoverNew: 'Discover New Music',
    recentlyPlayed: 'Recently Played',
    charts: 'SoundCloud Charts',
    top50: 'SoundCloud Top 50 Chart',
    top50Subtitle: 'World\'s most played music in real-time',
    hotTracks: 'Hot Releases',
    seeAll: 'See all',
    playAll: 'Play all',
    listenEntireChart: 'Play Full Chart',
    refreshStream: 'Refresh Stream',
    serverUnavailableTitle: 'SoundCloud servers did not respond',
    serverUnavailableDesc: 'The connection may be restricted by your network provider. Check Settings -> Proxy & Network Routing to switch to local proxy or VPN.',
    trendingGlobal: '#1 TRENDING GLOBAL',
    playlistsAndMixes: 'Playlists & Mixes',
    playlistsSubtitle: 'Curated selections by SoundCloud editors',
    allPlaylists: 'All playlists',
    newReleasesTitle: 'New Releases 2026',
    newReleasesSubtitle: 'Fresh tracks uploaded by creators recently',
    newReleaseTag: 'New Release',
    genresAndCategories: 'Genres & Categories',
    genresSubtitle: 'Fast switching by genre and style',
    loadingChart: 'Loading SoundCloud charts...',
    loadingGenreTracks: 'Loading tracks...',

    // Library View
    libraryTitle: 'Library',
    librarySubtitle: 'Explore your saved collection, featured playlists, liked tracks, and listening history.',
    overviewTab: 'Overview',
    playlistsTab: 'Playlists',
    likedTab: 'Liked Tracks',
    historyTab: 'History',
    likedTracks: 'Liked Tracks',
    followingArtists: 'Following',
    listeningHistory: 'Listening History',
    noLikedTracks: 'You have no liked tracks yet',
    noLikedTracksDesc: 'Click the heart icon on any track to add it to your personal likes.',
    noHistory: 'Listening history is empty',
    noPlaylists: 'No playlists found',
    tracksCount: 'tracks',
    backToLibrary: 'Back to Library',
    curatedBy: 'Curated by',
    trendingToLike: 'Trending Tracks to Like',
    featuredPlaylists: 'Featured & Personal Playlists',
    viewAll: 'View all',
    loadingLibrary: 'Loading your SoundCloud library...',

    // Downloads View
    downloadsTitle: 'Downloads & Offline Cache',
    downloadsSubtitle: 'Music saved on your computer for offline playback without Internet',
    openFolder: 'Open Downloads Folder',
    changeFolder: 'Change Folder',
    noDownloads: 'No downloaded tracks',
    noDownloadsDesc: 'Click the download button next to any track or playlist to save it locally on your PC.',
    downloading: 'Downloading...',
    downloadComplete: 'Track downloaded',
    downloadFailed: 'Download failed',
    openDownloadsFolder: 'Open Downloads Folder',

    // Modals & Settings
    themeAndSettings: 'Settings & Appearance',
    appearanceAndNetwork: 'Appearance & Network Settings',
    appearanceSubtitle: 'Custom themes, ambient backgrounds, and network configuration',
    interfaceLanguage: 'Interface Language',
    chooseLanguage: 'Select client display language',
    languageHint: 'Instant switching of application and desktop overlay language in runtime',
    themes: 'Color Themes',
    customBackground: 'Custom Background (GIF / Video)',
    proxyAndNetwork: 'Network & Proxy Routing',
    save: 'Save',
    cancel: 'Cancel',
    applied: 'Applied',
    russian: 'Русский',
    english: 'English',
    languageSwitched: 'Language switched to English',
    builtInBypass: 'Built-in Network Bypass (DoH / Proxy)',
    systemMode: 'Direct / System',
    backgroundMedia: 'Background Media',
    backgroundMediaDesc: 'Select an animated GIF, MP4/WebM video, or high-res image',
    resetToDefault: 'Reset to Default',
    chooseFileFromPc: 'Choose File from PC (GIF, Video, Image)',
    browseFilesPc: 'Browse Files on PC',
    directLinkUrl: 'Direct Link / URL (GIF / MP4 / Image)',
    applyUrl: 'Apply URL',
    backgroundDimming: 'Background Dimming / Dark Overlay',
    backgroundBlur: 'Background Blur',
    bypassTitle: 'SoundCloud Network Routing & Bypass',
    bypassSubtitle: 'Stream and download tracks at full speed without external system VPN',
    autoDetect: 'Auto Detect',
    searchingProxy: 'Searching...',
    clientDetected: 'Active client detected',
    connectToProxy: 'Connect',
    directConnectionMode: 'Direct Connection Mode',
    resetProxy: 'Reset',

    // Auth & Login Modal
    authRequired: 'SoundCloud login required for playback',
    loginToSoundCloud: 'Log In to SoundCloud',
    loginDescription: 'For music playback and media library synchronization',
    browserLogin: 'Log in with SoundCloud',
    tokenLogin: 'Manual OAuth Session Token',
    hideManualLogin: 'Hide manual entry',
    cookiesSync: 'Sync Browser Cookies',
    tokenPlaceholder: 'OAuth 2-xxxx or JWT token...',
    applyToken: 'Apply Token',
    continueWithoutLogin: 'Continue without login',
    loginSuccess: 'Successfully logged in',
    logoutSuccess: 'Logged out successfully',
    authorizedAs: 'You are signed in as',
    connectionRoute: 'Connection Route',
    loginNotice: 'Playback, playlists, and favorites synchronization require signing in to your SoundCloud profile.',

    // Lyrics & Comments
    lyricsTitle: 'Synchronized Lyrics',
    noLyricsAvailable: 'No lyrics available for this track in LRCLIB database',
    commentsTitle: 'Track Comments',
    noCommentsYet: 'No comments on this track yet',
    writeComment: 'Write a comment...',
    sendComment: 'Post Comment',
    tabLyrics: 'Lyrics',
    tabDescription: 'Description',
    tabEditor: 'Custom / Editor',
    syncDelay: 'Sync offset:',
    resetOffset: 'Reset',
    saveUserLyrics: 'Save Custom Lyrics',
    userLyricsSaved: 'Custom lyrics saved',

    // Playlists & Curated Mixes
    playlistsViewTitle: 'Playlists & Curated Mixes',
    playlistsViewSubtitle: 'Real-time trending and curated albums from SoundCloud official feeds',
    refreshPlaylists: 'Refresh',
    backToPlaylists: 'Back to all playlists',
    curatedPlaylistBadge: 'Curated Playlist',
    noPlaylistsCategory: 'No playlists found for this category.',

    // Track List Headers
    colTitle: 'Title',
    colArtist: 'Artist',
    colDuration: 'Time',
    colPlays: 'Plays',
    colActions: 'Actions',
    noTracksFound: 'No tracks found. Try refreshing the stream or check proxy status in settings.',

    // Profile View
    profileTitle: 'SOUNDCLOUD PROFILE',
    followersCount: 'Followers',
    followingCount: 'Following',
    streamTracksCount: 'Stream Tracks',
    likesCount: 'Likes',
    openOnWeb: 'Open on SoundCloud',
    switchAccount: 'Switch Account',

    // Feed View
    feedTitle: 'Stream & Feed',
    feedAuthSubtitle: 'Hear the latest tracks from creators you follow and your recommendations.',
    feedGuestSubtitle: 'Trending live stream from SoundCloud creators.',
    signInForFeed: 'Sign in for personalized feed',
    refreshFeed: 'Refresh feed',
    feedEmptyTitle: 'Your feed is currently quiet',
    feedEmptyDesc: 'Follow creators or check trending music to discover new tracks.',

    // Search Results View
    searchResultsFor: 'Search results for:',
    foundTracks: 'Found tracks:',
    noSearchResults: 'No tracks found matching your query',
    checkSpelling: 'Check your spelling or try different keywords or artist names.',
    tabTracks: 'Tracks',
    tabPlaylists: 'Playlists',

    // Track Page & Artist View
    backToTracks: 'Back',
    shareTrack: 'Share',
    relatedTracks: 'Related tracks',
    artistAbout: 'About',
    artistTracks: 'Tracks',
    artistPlaylists: 'Playlists',
    followArtist: 'Follow',
    followingArtist: 'Following',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

class I18nService {
  private currentLanguage: Language = 'ru';
  private listeners: Set<(lang: Language) => void> = new Set();
  private channel: BroadcastChannel | null = null;

  constructor() {
    const saved = localStorage.getItem('sc_language') as Language;
    if (saved === 'ru' || saved === 'en') {
      this.currentLanguage = saved;
    } else {
      const navLang = navigator.language.toLowerCase();
      this.currentLanguage = navLang.startsWith('ru') ? 'ru' : 'en';
    }

    // Cross-window synchronization (Electron multi-window: main + overlay)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'sc_language' && (e.newValue === 'ru' || e.newValue === 'en')) {
          this.setLanguageInternal(e.newValue as Language);
        }
      });

      try {
        this.channel = new BroadcastChannel('sc_i18n_channel');
        this.channel.onmessage = (e) => {
          if (e.data?.lang === 'ru' || e.data?.lang === 'en') {
            this.setLanguageInternal(e.data.lang);
          }
        };
      } catch {}
    }
  }

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  private setLanguageInternal(lang: Language): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    this.notify();
  }

  public setLanguage(lang: Language): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    localStorage.setItem('sc_language', lang);
    try {
      this.channel?.postMessage({ lang });
    } catch {}
    this.notify();
  }

  public toggleLanguage(): Language {
    const next: Language = this.currentLanguage === 'ru' ? 'en' : 'ru';
    this.setLanguage(next);
    return next;
  }

  public t(key: TranslationKey): string {
    return translations[this.currentLanguage][key] || translations.en[key] || key;
  }

  public subscribe(listener: (lang: Language) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentLanguage);
      } catch {}
    }
  }
}

export const i18n = new I18nService();

export function useI18n() {
  const [lang, setLang] = useState<Language>(() => i18n.getLanguage());

  useEffect(() => {
    return i18n.subscribe((newLang) => {
      setLang(newLang);
    });
  }, []);

  return {
    lang,
    t: (key: TranslationKey) => i18n.t(key),
    setLanguage: (newLang: Language) => i18n.setLanguage(newLang),
    toggleLanguage: () => i18n.toggleLanguage(),
  };
}
