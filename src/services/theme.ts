export interface ThemeDefinition {
  id: string;
  name: string;
  category: string;
  colors: {
    bg: string;
    surface: string;
    hover: string;
    border: string;
    accent: string;
    accentHover: string;
    textPrimary: string;
    textSecondary: string;
    waveActive: string;
    waveInactive: string;
  };
}

export interface CustomBackground {
  type: 'none' | 'image' | 'video';
  url: string;
  opacity: number;
  blur: number;
}

export const THEME_PRESETS: ThemeDefinition[] = [
  {
    id: 'tokyo-red',
    name: 'Tokyo Red (Красный Токио)',
    category: 'Cyberpunk & Anime',
    colors: {
      bg: '#0a0305',
      surface: '#15060b',
      hover: '#240a12',
      border: '#3b111e',
      accent: '#ff0055',
      accentHover: '#ff2670',
      textPrimary: '#ffffff',
      textSecondary: '#b87c8d',
      waveActive: '#ff0055',
      waveInactive: '#3b111e',
    },
  },
  {
    id: 'tokyo-blood-moon',
    name: 'Tokyo Blood Moon (Кровавая Луна)',
    category: 'Cyberpunk & Anime',
    colors: {
      bg: '#0d0407',
      surface: '#1a080e',
      hover: '#2d0e19',
      border: '#451325',
      accent: '#e60026',
      accentHover: '#ff1a3d',
      textPrimary: '#ffffff',
      textSecondary: '#b58593',
      waveActive: '#e60026',
      waveInactive: '#401121',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077 (Найт-Сити)',
    category: 'Cyberpunk & Anime',
    colors: {
      bg: '#0b0d13',
      surface: '#131622',
      hover: '#1c2030',
      border: '#2a3047',
      accent: '#fcee0a',
      accentHover: '#fff33b',
      textPrimary: '#ffffff',
      textSecondary: '#8d95af',
      waveActive: '#fcee0a',
      waveInactive: '#2c334d',
    },
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud Classic (Оригинал)',
    category: 'Official',
    colors: {
      bg: '#121212',
      surface: '#1e1e1e',
      hover: '#282828',
      border: '#333333',
      accent: '#ff5500',
      accentHover: '#ff6a00',
      textPrimary: '#ffffff',
      textSecondary: '#999999',
      waveActive: '#ff5500',
      waveInactive: '#444444',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s (Майами Неон)',
    category: 'Vaporwave',
    colors: {
      bg: '#0c0319',
      surface: '#17072e',
      hover: '#260c4a',
      border: '#3c1375',
      accent: '#ff007f',
      accentHover: '#ff3399',
      textPrimary: '#ffffff',
      textSecondary: '#ad8ec2',
      waveActive: '#ff007f',
      waveInactive: '#3d1573',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Emerald (Терминал Матрицы)',
    category: 'Sci-Fi',
    colors: {
      bg: '#020b04',
      surface: '#07180a',
      hover: '#0e2912',
      border: '#153d1c',
      accent: '#00ff66',
      accentHover: '#33ff85',
      textPrimary: '#eafff1',
      textSecondary: '#6e9e76',
      waveActive: '#00ff66',
      waveInactive: '#17421f',
    },
  },
  {
    id: 'nordic',
    name: 'Nordic Frost (Северный Лед)',
    category: 'Minimal',
    colors: {
      bg: '#07101e',
      surface: '#0f1d33',
      hover: '#162947',
      border: '#213a63',
      accent: '#00d2ff',
      accentHover: '#38dcff',
      textPrimary: '#f0f8ff',
      textSecondary: '#839bbd',
      waveActive: '#00d2ff',
      waveInactive: '#233e6b',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura Night (Токийская Сакура)',
    category: 'Anime',
    colors: {
      bg: '#130712',
      surface: '#1f0d1d',
      hover: '#2e142b',
      border: '#421d3e',
      accent: '#ff758c',
      accentHover: '#ff8da1',
      textPrimary: '#ffffff',
      textSecondary: '#b889b0',
      waveActive: '#ff758c',
      waveInactive: '#451f41',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha (Каппучино)',
    category: 'Developer',
    colors: {
      bg: '#181825',
      surface: '#1e1e2e',
      hover: '#313244',
      border: '#45475a',
      accent: '#cba6f7',
      accentHover: '#d9bbf9',
      textPrimary: '#cdd6f4',
      textSecondary: '#a6adc8',
      waveActive: '#cba6f7',
      waveInactive: '#45475a',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula Vampire (Дракула)',
    category: 'Gothic',
    colors: {
      bg: '#1e1f29',
      surface: '#282a36',
      hover: '#383a4c',
      border: '#44475a',
      accent: '#bd93f9',
      accentHover: '#caa7fa',
      textPrimary: '#f8f8f2',
      textSecondary: '#6272a4',
      waveActive: '#ff79c6',
      waveInactive: '#44475a',
    },
  },
  {
    id: 'oled',
    name: 'OLED Pure Black (Чистый Черный)',
    category: 'Minimal',
    colors: {
      bg: '#000000',
      surface: '#0d0d0d',
      hover: '#171717',
      border: '#242424',
      accent: '#ffffff',
      accentHover: '#e0e0e0',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      waveActive: '#ffffff',
      waveInactive: '#282828',
    },
  },
];

export const BACKGROUND_PRESETS = [
  {
    name: 'Tokyo Red Rain (Аниме дождь)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Cyberpunk Shinjuku (Неоновый Токио)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Anime Cyber City Night (Ночной мегаполис)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Purple Synthwave Sunset (Ретро закат)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Cosmic Nebula Stars (Космическая туманность)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Tokyo Alley Night Walk (Улочка Токио)',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1920&q=80',
  },
];

const THEME_STORAGE_KEY = 'sc_custom_theme_id';
const BG_STORAGE_KEY = 'sc_custom_background_config';

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeDefinition = THEME_PRESETS[0];
  private customBg: CustomBackground = {
    type: 'none',
    url: '',
    opacity: 50,
    blur: 0,
  };
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.load();
    this.applyToDOM();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private load(): void {
    try {
      const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedThemeId) {
        const found = THEME_PRESETS.find((t) => t.id === savedThemeId);
        if (found) this.currentTheme = found;
      }
      const savedBg = localStorage.getItem(BG_STORAGE_KEY);
      if (savedBg) {
        this.customBg = JSON.parse(savedBg);
      }
    } catch {}
  }

  public applyToDOM(): void {
    const root = document.documentElement;
    const c = this.currentTheme.colors;
    root.style.setProperty('--sc-bg', c.bg);
    root.style.setProperty('--sc-surface', c.surface);
    root.style.setProperty('--sc-hover', c.hover);
    root.style.setProperty('--sc-border', c.border);
    root.style.setProperty('--sc-accent', c.accent);
    root.style.setProperty('--sc-accent-hover', c.accentHover);
    root.style.setProperty('--sc-text-primary', c.textPrimary);
    root.style.setProperty('--sc-text-secondary', c.textSecondary);
    root.style.setProperty('--sc-wave-active', c.waveActive);
    root.style.setProperty('--sc-wave-inactive', c.waveInactive);
  }

  public getTheme(): ThemeDefinition {
    return this.currentTheme;
  }

  public getBackground(): CustomBackground {
    return this.customBg;
  }

  public setTheme(themeId: string): void {
    const found = THEME_PRESETS.find((t) => t.id === themeId);
    if (found) {
      this.currentTheme = found;
      localStorage.setItem(THEME_STORAGE_KEY, found.id);
      this.applyToDOM();
      this.notify();
    }
  }

  public setBackground(bg: CustomBackground): void {
    this.customBg = bg;
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bg));
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }
}

export const themeService = ThemeService.getInstance();
