import React, { useState, useEffect } from 'react';
import {
  Palette,
  Network,
  Download,
  User,
  ShieldCheck,
  Check,
  Folder,
  RefreshCw,
  LogOut,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import { themeService, ThemeDefinition } from '@/services/theme';
import { authService } from '@/services/auth';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/services/i18n';

interface SettingsViewProps {
  onOpenLogin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenLogin }) => {
  const { lang, t, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState('language');
  const [currentTheme, setCurrentTheme] = useState<ThemeDefinition>(themeService.getTheme());
  const [themes] = useState<ThemeDefinition[]>(themeService.getAllThemes());
  const [dohEnabled, setDohEnabled] = useState(true);
  const [currentProxy, setCurrentProxy] = useState<string | null>(null);
  const [proxyInput, setProxyInput] = useState('');
  const [detectedProxies, setDetectedProxies] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);
  const [testingProxy, setTestingProxy] = useState(false);
  const [downloadFolder, setDownloadFolder] = useState<string>('Default (Downloads/SoundCloud)');
  const [syncingSession, setSyncingSession] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

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
      if (res && res.success && res.candidates) {
        setDetectedProxies(res.candidates);
        setCurrentProxy(res.proxy);
        setProxyInput(res.proxy);
      } else if (res && res.success && res.proxy) {
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
    const rule = proxyStr ? proxyStr.trim() : null;
    const res = await (window as any).electronAPI.setProxy(rule);
    if (res && res.success) {
      setCurrentProxy(rule);
      setProxyStatus(rule ? `${t('connected')}: ${rule}` : t('directConnectionMode'));
      if (rule) {
        handleTestProxy(rule);
      }
      setTimeout(() => setProxyStatus(null), 4000);
    } else {
      setProxyStatus('Error applying proxy');
    }
  };

  const handleTestProxy = async (ruleToTest?: string) => {
    const target = ruleToTest !== undefined ? ruleToTest : proxyInput;
    if (!(window as any).electronAPI?.testProxy) return;
    setTestingProxy(true);
    setTestResult(null);
    try {
      const res = await (window as any).electronAPI.testProxy(target || null);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingProxy(false);
    }
  };

  const handleSyncSession = async () => {
    setSyncingSession(true);
    setSyncStatus(null);
    try {
      const res = await authService.syncSessionFromCookies();
      if (res.success) {
        setSyncStatus(t('loginSuccess'));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setSyncStatus(res.error || 'No active session found.');
      }
    } catch (err: any) {
      setSyncStatus(err?.message || 'Sync error');
    } finally {
      setSyncingSession(false);
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
    { id: 'language', label: `${t('interfaceLanguage')} (${lang.toUpperCase()})` },
    { id: 'network', label: t('proxyAndNetwork') },
    { id: 'appearance', label: t('themes') },
    { id: 'downloads', label: t('downloads') },
    { id: 'account', label: t('profile') },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-[#242424] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('themeAndSettings')}</h1>
        <p className="text-xs text-[#888888] mt-1">
          {t('appearanceSubtitle')}
        </p>
      </div>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'language' && (
        <div className="space-y-6 bg-[#161616] p-6 rounded-lg border border-[#242424]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Languages size={18} className="text-[#ff5500]" />
              <span>{t('chooseLanguage')}</span>
            </h2>
            <p className="text-xs text-[#888888] mt-1">
              {t('languageHint')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setLanguage('ru')}
              className={`cursor-pointer rounded-lg border p-4 transition-all flex flex-col justify-between ${
                lang === 'ru'
                  ? 'border-[#ff5500] bg-[#ff5500]/10 shadow-lg'
                  : 'border-[#282828] bg-[#1a1a1a] hover:border-[#ff5500]/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🇷🇺</span>
                  <span className="text-sm font-bold text-white">Русский</span>
                </div>
                {lang === 'ru' && <CheckCircle2 size={18} className="text-[#ff5500]" />}
              </div>
              <p className="text-xs text-[#888888]">
                Полный русский интерфейс и оверлей
              </p>
            </div>

            <div
              onClick={() => setLanguage('en')}
              className={`cursor-pointer rounded-lg border p-4 transition-all flex flex-col justify-between ${
                lang === 'en'
                  ? 'border-[#ff5500] bg-[#ff5500]/10 shadow-lg'
                  : 'border-[#282828] bg-[#1a1a1a] hover:border-[#ff5500]/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-sm font-bold text-white">English</span>
                </div>
                {lang === 'en' && <CheckCircle2 size={18} className="text-[#ff5500]" />}
              </div>
              <p className="text-xs text-[#888888]">
                Complete English interface and desktop overlay
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-6 bg-[#161616] p-6 rounded-lg border border-[#242424]">
          <div className="flex items-start justify-between pb-4 border-b border-[#282828] gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ff5500]" />
                <span>DNS over HTTPS (DoH)</span>
              </h2>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Control D, AdGuard, Cloudflare DNS.
              </p>
            </div>
            <Button
              size="sm"
              variant={dohEnabled ? 'primary' : 'secondary'}
              onClick={handleToggleDoh}
            >
              {dohEnabled ? t('connected') : t('cancel')}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Network size={18} className="text-[#ff5500]" />
                  <span>{t('bypassTitle')}</span>
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  {t('bypassSubtitle')}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} className={detecting ? 'animate-spin' : ''} />}
                onClick={handleAutoDetectProxy}
              >
                {detecting ? t('searchingProxy') : t('autoDetect')}
              </Button>
            </div>

            {detectedProxies.length > 0 ? (
              <div className="space-y-2.5 mb-5">
                {detectedProxies.map((p, idx) => {
                  const isCurrent = currentProxy === p.proxy;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-emerald-500/60 bg-emerald-950/20'
                          : 'border-[#282828] bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-[#555]'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {p.name || 'Local Proxy'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#888] font-mono">{p.proxy}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isCurrent ? 'primary' : 'secondary'}
                        onClick={() => handleApplyProxy(p.proxy)}
                      >
                        {isCurrent ? t('connected') : t('connectToProxy')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                placeholder="http://127.0.0.1:39706"
                className="flex-1 rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs text-white placeholder:text-[#666] font-mono focus:border-[#ff5500] focus:outline-none"
              />
              <Button size="sm" variant="primary" onClick={() => handleApplyProxy(proxyInput)}>
                {t('save')}
              </Button>
              {currentProxy && (
                <Button size="sm" variant="danger" onClick={() => handleApplyProxy('')}>
                  {t('resetProxy')}
                </Button>
              )}
            </div>

            {proxyStatus && (
              <p className="text-xs text-emerald-400 mt-2 font-medium">
                {proxyStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6 bg-[#161616] p-6 rounded-lg border border-[#242424]">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Palette size={18} className="text-[#ff5500]" />
              <span>{t('themes')}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {themes.map((th) => {
                const isSelected = currentTheme.id === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => handleSelectTheme(th.id)}
                    className={`flex flex-col p-3 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-[#ff5500] bg-[#1e1e1e] ring-1 ring-[#ff5500]'
                        : 'border-[#282828] bg-[#161616] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: th.colors.accent }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: th.colors.bg }}
                      />
                      {isSelected && (
                        <Check size={14} className="text-[#ff5500] ml-auto" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate">
                      {th.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'downloads' && (
        <div className="space-y-4 bg-[#161616] p-5 rounded-lg border border-[#242424]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download size={16} className="text-[#ff5500]" />
            <span>{t('downloadsTitle')}</span>
          </h2>
          <p className="text-xs text-[#888888]">
            {t('downloadsSubtitle')}
          </p>

          <div className="flex items-center gap-3 p-3 rounded bg-[#1e1e1e] border border-[#2a2a2a]">
            <Folder size={18} className="text-[#ff5500] shrink-0" />
            <span className="text-xs font-mono text-[#cccccc] truncate flex-1">
              {downloadFolder}
            </span>
            <Button size="sm" variant="secondary" onClick={handleChooseFolder}>
              {t('changeFolder')}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpenFolder}>
              {t('openFolder')}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-5 bg-[#161616] p-6 rounded-lg border border-[#242424]">
          <div className="flex items-center justify-between pb-4 border-b border-[#282828]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <User size={16} className="text-[#ff5500]" />
                <span>{t('profile')}</span>
              </h2>
            </div>
            <Button
              size="sm"
              variant="primary"
              disabled={syncingSession}
              icon={<RefreshCw size={13} className={syncingSession ? 'animate-spin' : ''} />}
              onClick={handleSyncSession}
            >
              {t('cookiesSync')}
            </Button>
          </div>

          {syncStatus && (
            <p className="text-xs font-semibold text-[#ff5500] bg-[#221510] p-3 rounded border border-[#ff5500]/30">
              {syncStatus}
            </p>
          )}

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

              <div className="pt-2 flex gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onOpenLogin}
                >
                  {t('switchAccount')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<LogOut size={14} />}
                  onClick={() => {
                    authService.logout();
                    window.location.reload();
                  }}
                >
                  {t('logout')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#888888]">
                {t('loginNotice')}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={onOpenLogin}>
                  {t('loginToSoundCloud')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
