import React, { useState, useEffect } from 'react';
import { Palette, Network, Download, User, ShieldCheck, Check, Folder, RefreshCw, LogOut } from 'lucide-react';
import { themeService, ThemeDefinition } from '@/services/theme';
import { authService } from '@/services/auth';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';

interface SettingsViewProps {
  onOpenLogin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenLogin }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [currentTheme, setCurrentTheme] = useState<ThemeDefinition>(themeService.getTheme());
  const [themes] = useState<ThemeDefinition[]>(themeService.getAllThemes());
  const [dohEnabled, setDohEnabled] = useState(true);
  const [currentProxy, setCurrentProxy] = useState<string | null>(null);
  const [proxyInput, setProxyInput] = useState('');
  const [detectedProxies, setDetectedProxies] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);
  const [downloadFolder, setDownloadFolder] = useState<string>('Default (Downloads/SoundCloud)');

  const isAuth = authService.isAuthenticated();
  const session = authService.getSession();

  useEffect(() => {
    if ((window as any).electronAPI?.getNetworkSettings) {
      (window as any).electronAPI.getNetworkSettings().then((ns: any) => {
        if (ns) {
          setDohEnabled(ns.dohEnabled !== false);
        }
      });
    }
    if ((window as any).electronAPI?.detectLocalProxy) {
      handleAutoDetectProxy();
    }
  }, []);

  const handleSelectTheme = (id: string) => {
    themeService.setTheme(id);
    setCurrentTheme(themeService.getTheme());
  };

  const handleToggleDoh = async () => {
    const next = !dohEnabled;
    setDohEnabled(next);
    if ((window as any).electronAPI?.setDoh) {
      await (window as any).electronAPI.setDoh(next);
    }
  };

  const handleAutoDetectProxy = async () => {
    if (!(window as any).electronAPI?.detectLocalProxy) return;
    setDetecting(true);
    try {
      const res = await (window as any).electronAPI.detectLocalProxy();
      if (res && res.success) {
        setDetectedProxies([res]);
        setCurrentProxy(res.proxy);
        setProxyInput(res.proxy);
      } else {
        setDetectedProxies([]);
      }
    } catch {
      setDetectedProxies([]);
    } finally {
      setDetecting(false);
    }
  };

  const handleApplyProxy = async (proxyStr: string) => {
    if (!(window as any).electronAPI?.setProxy) return;
    const res = await (window as any).electronAPI.setProxy(proxyStr || null);
    if (res && res.success) {
      setCurrentProxy(res.proxy);
      setProxyStatus('Proxy applied successfully');
      setTimeout(() => setProxyStatus(null), 3000);
    } else {
      setProxyStatus('Failed to set proxy');
    }
  };

  const handleChooseFolder = async () => {
    if (!(window as any).electronAPI?.selectDownloadFolder) return;
    const folder = await (window as any).electronAPI.selectDownloadFolder();
    if (folder) {
      setDownloadFolder(folder);
    }
  };

  const handleOpenFolder = () => {
    if ((window as any).electronAPI?.openDownloadsFolder) {
      (window as any).electronAPI.openDownloadsFolder();
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'network', label: 'Network & Proxy' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'account', label: 'Account' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-[#242424] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-xs text-[#888888] mt-1">
          Customize themes, network proxy bypass, downloads, and account.
        </p>
      </div>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Palette size={16} className="text-[#ff5500]" />
              <span>Theme Preset (11 Desktop Themes)</span>
            </h2>
            <p className="text-xs text-[#888888] mb-4">
              SoundCloud Web Dark is the authentic official theme. Select any theme preset below.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {themes.map((t) => {
                const isSelected = currentTheme.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`flex flex-col p-3 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-[#ff5500] bg-[#1e1e1e] ring-1 ring-[#ff5500]'
                        : 'border-[#282828] bg-[#161616] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: t.colors.accent }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: t.colors.bg }}
                      />
                      {isSelected && (
                        <Check size={14} className="text-[#ff5500] ml-auto" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-6 bg-[#161616] p-5 rounded-lg border border-[#242424]">
          <div className="flex items-center justify-between pb-4 border-b border-[#282828]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#ff5500]" />
                <span>DNS over HTTPS (DoH) Multi-Engine</span>
              </h2>
              <p className="text-xs text-[#888888] mt-0.5">
                Resolves SoundCloud domains securely via Control D, AdGuard, and Cloudflare.
              </p>
            </div>
            <Button
              size="sm"
              variant={dohEnabled ? 'primary' : 'secondary'}
              onClick={handleToggleDoh}
            >
              {dohEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Network size={16} className="text-[#ff5500]" />
                <span>Local Proxy Auto-Detection (Clash Verge / v2ray / ByeDPI)</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} className={detecting ? 'animate-spin' : ''} />}
                onClick={handleAutoDetectProxy}
              >
                Scan
              </Button>
            </div>

            {detectedProxies.length > 0 ? (
              <div className="space-y-2 mb-4">
                {detectedProxies.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded bg-[#1f1f1f] border border-[#2e2e2e]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{p.name || 'Local Proxy'}</p>
                      <p className="text-[11px] font-mono text-[#ff5500]">{p.proxy}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleApplyProxy(p.proxy)}
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#777777] mb-4">
                No active local proxy detected on standard ports. Ensure Clash Verge is in Rule or Global mode.
              </p>
            )}

            <div className="space-y-2">
              <label className="text-xs text-[#888888]">Custom Proxy URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  placeholder="e.g. http://127.0.0.1:7890 or socks5://127.0.0.1:10808"
                  className="flex-1 rounded border border-[#2e2e2e] bg-[#121212] px-3 py-1.5 text-xs text-white placeholder:text-[#555555] focus:border-[#ff5500] focus:outline-none font-mono"
                />
                <Button size="sm" variant="secondary" onClick={() => handleApplyProxy(proxyInput)}>
                  Apply
                </Button>
                {currentProxy && (
                  <Button size="sm" variant="ghost" onClick={() => handleApplyProxy('')}>
                    Direct
                  </Button>
                )}
              </div>
              {proxyStatus && (
                <p className="text-xs text-[#ff5500] mt-1">{proxyStatus}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'downloads' && (
        <div className="space-y-4 bg-[#161616] p-5 rounded-lg border border-[#242424]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download size={16} className="text-[#ff5500]" />
            <span>Downloads Directory</span>
          </h2>
          <p className="text-xs text-[#888888]">
            Audio tracks downloaded directly through the app are saved with complete artwork and metadata.
          </p>

          <div className="flex items-center gap-3 p-3 rounded bg-[#1e1e1e] border border-[#2a2a2a]">
            <Folder size={18} className="text-[#ff5500] shrink-0" />
            <span className="text-xs font-mono text-[#cccccc] truncate flex-1">
              {downloadFolder}
            </span>
            <Button size="sm" variant="secondary" onClick={handleChooseFolder}>
              Change
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpenFolder}>
              Open Folder
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-4 bg-[#161616] p-5 rounded-lg border border-[#242424]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <User size={16} className="text-[#ff5500]" />
            <span>SoundCloud Account</span>
          </h2>

          {isAuth ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {session.user?.avatar_url ? (
                  <img
                    src={session.user.avatar_url}
                    alt={session.user?.username}
                    className="w-12 h-12 rounded-full object-cover border border-[#333333]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center text-white font-bold">
                    {session.user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">{session.user?.username}</h3>
                  <p className="text-xs text-[#888888]">{session.user?.city || 'SoundCloud Member'}</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="danger"
                  icon={<LogOut size={14} />}
                  onClick={() => {
                    authService.logout();
                    window.location.reload();
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#888888]">
                Sign in to sync your personal likes, followings, playlists, and stream history.
              </p>
              <Button size="sm" variant="primary" onClick={onOpenLogin}>
                Sign In with SoundCloud
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
