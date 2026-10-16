import { useState, useEffect } from 'react';
import { themeService, THEME_PRESETS, BACKGROUND_PRESETS, CustomBackground } from '@/services/theme';
import { X, Palette, Image as ImageIcon, Video, Check, Upload, Sliders, Sparkles, Shield, Globe, CheckCircle2 } from 'lucide-react';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeSettingsModal({ isOpen, onClose }: ThemeSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'themes' | 'background' | 'network'>('themes');
  const [currentTheme, setCurrentTheme] = useState(themeService.getTheme());
  const [bgConfig, setBgConfig] = useState<CustomBackground>(themeService.getBackground());
  const [customUrl, setCustomUrl] = useState(bgConfig.url || '');
  const [proxyInput, setProxyInput] = useState('');
  const [activeProxy, setActiveProxy] = useState('');
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sc_proxy_rule');
    if (saved) {
      setProxyInput(saved);
      setActiveProxy(saved);
    }
  }, []);

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: string) => {
    themeService.setTheme(themeId);
    setCurrentTheme(themeService.getTheme());
  };

  const handleApplyBackground = (newBg: CustomBackground) => {
    setBgConfig(newBg);
    themeService.setBackground(newBg);
  };

  const handleNativeFileSelect = async () => {
    if (window.electronAPI?.selectBackgroundFile) {
      const result = await window.electronAPI.selectBackgroundFile();
      if (result) {
        const updated: CustomBackground = {
          ...bgConfig,
          type: result.type,
          url: result.url,
        };
        handleApplyBackground(updated);
      }
    }
  };

  const handleBrowserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const updated: CustomBackground = {
            ...bgConfig,
            type: isVideo ? 'video' : 'image',
            url: reader.result,
          };
          handleApplyBackground(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlApply = () => {
    if (!customUrl.trim()) return;
    const isVideo = customUrl.endsWith('.mp4') || customUrl.endsWith('.webm');
    const updated: CustomBackground = {
      ...bgConfig,
      type: isVideo ? 'video' : 'image',
      url: customUrl.trim(),
    };
    handleApplyBackground(updated);
  };

  const handleRemoveBackground = () => {
    const cleared: CustomBackground = {
      type: 'none',
      url: '',
      opacity: 50,
      blur: 0,
    };
    setCustomUrl('');
    handleApplyBackground(cleared);
  };

  const handleApplyProxy = async (proxyRule: string) => {
    const clean = proxyRule.trim();
    if (window.electronAPI?.setProxy) {
      await window.electronAPI.setProxy(clean || null);
    }
    setActiveProxy(clean);
    if (clean) {
      localStorage.setItem('sc_proxy_rule', clean);
      setProxyStatus('Proxy applied successfully!');
    } else {
      localStorage.removeItem('sc_proxy_rule');
      setProxyStatus('Direct mode activated (Proxy disabled).');
    }
    setTimeout(() => setProxyStatus(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl h-[700px] flex flex-col rounded-sc border border-sc-border bg-sc-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-sc-border px-6 py-4 bg-[#141414]">
          <div className="flex items-center gap-3">
            <Palette className="text-sc-accent" size={24} />
            <div>
              <h2 className="text-base font-bold text-white">Appearance & Network Studio</h2>
              <p className="text-xs text-sc-text-secondary">Custom themes, live backgrounds, and in-app bypass proxy</p>
            </div>
          </div>

          <button onClick={onClose} className="text-sc-text-secondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-sc-border bg-[#111] px-6 gap-2">
          <button
            onClick={() => setActiveTab('themes')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'themes'
                ? 'border-sc-accent text-sc-accent'
                : 'border-transparent text-sc-text-secondary hover:text-white'
            }`}
          >
            <Palette size={15} />
            Aesthetic Themes ({THEME_PRESETS.length})
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'background'
                ? 'border-sc-accent text-sc-accent'
                : 'border-transparent text-sc-text-secondary hover:text-white'
            }`}
          >
            <ImageIcon size={15} />
            Custom Background (GIF / Video)
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'network'
                ? 'border-sc-accent text-sc-accent'
                : 'border-transparent text-sc-text-secondary hover:text-white'
            }`}
          >
            <Globe size={15} />
            Bypass / Network (Без VPN)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'themes' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEME_PRESETS.map((t) => {
                const isSelected = currentTheme.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`cursor-pointer rounded-sc border p-4 transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'border-sc-accent bg-[#1e1e1e] ring-1 ring-sc-accent shadow-lg shadow-sc-accent/20'
                        : 'border-sc-border bg-[#141414] hover:border-sc-hover hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {t.name}
                          {t.id.includes('tokyo') && <Sparkles size={13} className="text-sc-accent" />}
                        </h4>
                        <span className="text-[10px] text-sc-text-secondary uppercase tracking-wider">{t.category}</span>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-sc-accent flex items-center justify-center text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 h-7 rounded-sc p-1.5" style={{ backgroundColor: t.colors.bg, border: `1px solid ${t.colors.border}` }}>
                      <div className="h-full w-8 rounded-sc" style={{ backgroundColor: t.colors.surface }} />
                      <div className="h-full flex-1 rounded-sc" style={{ backgroundColor: t.colors.hover }} />
                      <div className="h-full w-12 rounded-sc shadow-sm" style={{ backgroundColor: t.colors.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'background' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-sc-border">
                <div>
                  <h4 className="text-sm font-bold text-white">Background Media</h4>
                  <p className="text-xs text-sc-text-secondary mt-0.5">Select a PC file (GIF, MP4, photo) or choose an aesthetic preset</p>
                </div>
                {bgConfig.type !== 'none' && (
                  <button
                    onClick={handleRemoveBackground}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    Reset to Default
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-2">Aesthetic Presets (Tokyo Red, Cyberpunk, Synthwave)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BACKGROUND_PRESETS.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyBackground({ ...bgConfig, type: p.type, url: p.url })}
                      className="group cursor-pointer rounded-sc border border-sc-border overflow-hidden relative aspect-video transition-all hover:border-sc-accent hover:scale-[1.03]"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/55 p-2 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white leading-tight">{p.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-sc border border-sc-border bg-[#141414] p-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Upload size={14} className="text-sc-accent" />
                      Choose File from PC (GIF, Video, Image)
                    </label>
                    <p className="text-[11px] text-sc-text-secondary mb-3">
                      Select any animated GIF, MP4/WebM video, or high-res image from your computer.
                    </p>
                  </div>
                  {window.electronAPI?.selectBackgroundFile ? (
                    <button
                      onClick={handleNativeFileSelect}
                      className="w-full rounded-sc bg-sc-accent py-2.5 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors flex items-center justify-center gap-2 shadow-md shadow-sc-accent/20"
                    >
                      <Upload size={14} />
                      Browse Files on PC
                    </button>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-20 border border-dashed border-sc-border rounded-sc cursor-pointer hover:border-sc-accent hover:bg-[#1c1c1c] transition-colors">
                      <ImageIcon size={20} className="text-sc-text-secondary mb-1" />
                      <span className="text-xs text-sc-text-secondary">Click to choose file</span>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,.gif"
                        onChange={handleBrowserFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="rounded-sc border border-sc-border bg-[#141414] p-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Video size={14} className="text-sc-accent" />
                      Direct Link / URL (GIF / MP4 / Image)
                    </label>
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/tokyo_rain.gif"
                      className="w-full rounded-sc border border-sc-border bg-[#1a1a1a] px-3 py-2 text-xs text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleUrlApply}
                    className="w-full mt-3 rounded-sc border border-sc-border bg-sc-surface py-2 text-xs font-bold text-white hover:bg-sc-hover hover:border-sc-accent transition-colors"
                  >
                    Apply URL
                  </button>
                </div>
              </div>

              <div className="rounded-sc border border-sc-border bg-[#141414] p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                  <Sliders size={14} className="text-sc-accent" />
                  Background Visibility & Readability Controls
                </div>

                <div>
                  <div className="flex justify-between text-xs text-sc-text-secondary mb-1">
                    <span>Background Dimming / Dark Overlay</span>
                    <span>{bgConfig.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={bgConfig.opacity}
                    onChange={(e) => handleApplyBackground({ ...bgConfig, opacity: Number(e.target.value) })}
                    className="w-full accent-sc-accent h-1 bg-sc-border rounded-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-sc-text-secondary mb-1">
                    <span>Background Blur</span>
                    <span>{bgConfig.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={bgConfig.blur}
                    onChange={(e) => handleApplyBackground({ ...bgConfig, blur: Number(e.target.value) })}
                    className="w-full accent-sc-accent h-1 bg-sc-border rounded-full"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-sc-border">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="text-sc-accent" size={16} />
                    Обход блокировок SoundCloud (Режим для РФ без системного VPN)
                  </h4>
                  <p className="text-xs text-sc-text-secondary mt-0.5">
                    Позволяет слушать музыку и загружать треки напрямую внутри приложения без включения общего VPN на компьютере.
                  </p>
                </div>
              </div>

              <div className="rounded-sc border border-sc-border bg-[#141414] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Встроенный DNS-over-HTTPS (DoH)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">
                    Активен
                  </span>
                </div>
                <p className="text-xs text-sc-text-secondary leading-relaxed">
                  В движок приложения встроен прямой защищённый резолвер Cloudflare 1.1.1.1 и Google DNS, который автоматически обходит DNS-подмену интернет-провайдеров.
                </p>
              </div>

              <div className="rounded-sc border border-sc-border bg-[#141414] p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Встроенный прокси-туннель (SOCKS5 / HTTP)
                  </label>
                  <p className="text-[11px] text-sc-text-secondary mb-3">
                    Укажи адрес любого локального или внешнего прокси. Трафик будет идти через прокси только для SoundCloud, не замедляя остальной интернет.
                  </p>
                  <input
                    type="text"
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                    placeholder="socks5://127.0.0.1:10808 или http://127.0.0.1:7890"
                    className="w-full rounded-sc border border-sc-border bg-[#1a1a1a] px-3.5 py-2 text-xs text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApplyProxy(proxyInput)}
                    className="flex-1 rounded-sc bg-sc-accent py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-md"
                  >
                    Применить Прокси
                  </button>
                  {activeProxy && (
                    <button
                      onClick={() => {
                        setProxyInput('');
                        handleApplyProxy('');
                      }}
                      className="px-4 rounded-sc border border-sc-border bg-sc-surface py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Отключить
                    </button>
                  )}
                </div>

                {proxyStatus && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 size={14} />
                    <span>{proxyStatus}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-sc-border">
                  <span className="text-[11px] font-semibold text-sc-text-secondary block mb-2">
                    Популярные порты клиентов обхода (кликни для быстрой вставки):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setProxyInput('socks5://127.0.0.1:10808')}
                      className="text-[11px] px-2.5 py-1 rounded bg-[#202020] border border-sc-border text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
                    >
                      v2rayN / Xray (socks5://127.0.0.1:10808)
                    </button>
                    <button
                      onClick={() => setProxyInput('socks5://127.0.0.1:1080')}
                      className="text-[11px] px-2.5 py-1 rounded bg-[#202020] border border-sc-border text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
                    >
                      Zapret / ByeDPI (socks5://127.0.0.1:1080)
                    </button>
                    <button
                      onClick={() => setProxyInput('http://127.0.0.1:7890')}
                      className="text-[11px] px-2.5 py-1 rounded bg-[#202020] border border-sc-border text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
                    >
                      Clash / Flclash (http://127.0.0.1:7890)
                    </button>
                    <button
                      onClick={() => setProxyInput('socks5://127.0.0.1:9050')}
                      className="text-[11px] px-2.5 py-1 rounded bg-[#202020] border border-sc-border text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
                    >
                      Tor (socks5://127.0.0.1:9050)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
