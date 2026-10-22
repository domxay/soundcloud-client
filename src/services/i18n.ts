import { useState, useEffect } from 'react';

export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    // Navigation
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
    syncCookies: 'Синхронизировать сессию',
    connecting: 'Подключение...',
    connected: 'Подключено',
    directConnection: 'Прямое соединение',

    // Player
    play: 'Воспроизведение',
    pause: 'Пауза',
    previous: 'Предыдущий трек',
    next: 'Следующий трек',
    shuffle: 'Перемешать',
    repeatAll: 'Повторять все',
    repeatOne: 'Повторять один',
    repeatOff: 'Без повтора',
    lyrics: 'Текст песни',
    queue: 'Очередь воспроизведения',
    volume: 'Громкость',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    speed: 'Скорость',
    sleepTimer: 'Таймер сна',
    trackLiked: 'Добавлено в любимые',
    trackUnliked: 'Удалено из любимых',

    // Overlay
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

    // Modals & Settings
    themeAndSettings: 'Настройки и темы',
    interfaceLanguage: 'Язык интерфейса',
    chooseLanguage: 'Выберите язык интерфейса приложения',
    themes: 'Темы оформления',
    proxyAndNetwork: 'Прокси и обход блокировок',
    customBackground: 'Пользовательский фон',
    save: 'Сохранить',
    cancel: 'Отмена',
    applied: 'Применено',
    
    // Downloads
    downloadsTitle: 'Загрузки и кэш',
    openFolder: 'Открыть папку',
    noDownloads: 'Нет скачанных треков',
    downloading: 'Загрузка...',
    downloadComplete: 'Загрузка завершена',

    // Errors & Auth
    authRequired: 'Для прослушивания войдите в аккаунт SoundCloud',
    loginToSoundCloud: 'Вход в SoundCloud',
    proxyConnected: 'Прокси успешно подключен',
    proxyDisconnected: 'Прокси отключен',
    russian: 'Русский',
    english: 'English',
  },
  en: {
    // Navigation
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
    syncCookies: 'Sync Session Cookies',
    connecting: 'Connecting...',
    connected: 'Connected',
    directConnection: 'Direct Mode',

    // Player
    play: 'Play',
    pause: 'Pause',
    previous: 'Previous track',
    next: 'Next track',
    shuffle: 'Shuffle',
    repeatAll: 'Repeat all',
    repeatOne: 'Repeat one',
    repeatOff: 'Repeat off',
    lyrics: 'Lyrics',
    queue: 'Playback Queue',
    volume: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
    speed: 'Playback Speed',
    sleepTimer: 'Sleep Timer',
    trackLiked: 'Added to favorites',
    trackUnliked: 'Removed from favorites',

    // Overlay
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

    // Modals & Settings
    themeAndSettings: 'Settings & Appearance',
    interfaceLanguage: 'Interface Language',
    chooseLanguage: 'Select client display language',
    themes: 'Themes',
    proxyAndNetwork: 'Proxy & Network Bypass',
    customBackground: 'Custom Background',
    save: 'Save',
    cancel: 'Cancel',
    applied: 'Applied',

    // Downloads
    downloadsTitle: 'Downloads & Offline Cache',
    openFolder: 'Open Folder',
    noDownloads: 'No downloaded tracks',
    downloading: 'Downloading...',
    downloadComplete: 'Download complete',

    // Errors & Auth
    authRequired: 'SoundCloud login required for playback',
    loginToSoundCloud: 'Log In to SoundCloud',
    proxyConnected: 'Proxy applied successfully',
    proxyDisconnected: 'Proxy disabled',
    russian: 'Русский',
    english: 'English',
  },
} as const;

export type TranslationKey = keyof typeof translations.ru;

class I18nService {
  private currentLanguage: Language = 'ru';
  private listeners: Set<(lang: Language) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem('sc_language') as Language;
    if (saved === 'ru' || saved === 'en') {
      this.currentLanguage = saved;
    } else {
      const navLang = navigator.language.toLowerCase();
      this.currentLanguage = navLang.startsWith('ru') ? 'ru' : 'en';
    }
  }

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  public setLanguage(lang: Language): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    localStorage.setItem('sc_language', lang);
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
