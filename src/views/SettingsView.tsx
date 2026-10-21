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
} from 'lucide-react';
import { themeService, ThemeDefinition } from '@/services/theme';
import { authService } from '@/services/auth';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';

interface SettingsViewProps {
  onOpenLogin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenLogin }) => {
  const [activeTab, setActiveTab] = useState('network');
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
      setProxyStatus(rule ? `Подключено: ${rule}` : 'Режим: Системный VPN / Авто');
      if (rule) {
        handleTestProxy(rule);
      }
      setTimeout(() => setProxyStatus(null), 4000);
    } else {
      setProxyStatus('Ошибка подключения прокси');
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
        setSyncStatus('Сессия успешно синхронизирована из SoundCloud!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setSyncStatus(res.error || 'Активная сессия в куках не найдена. Войдите через окно входа.');
      }
    } catch (err: any) {
      setSyncStatus(err?.message || 'Ошибка синхронизации');
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
    { id: 'network', label: 'VPN и Обход блокировок' },
    { id: 'appearance', label: 'Оформление (Темы)' },
    { id: 'downloads', label: 'Загрузки' },
    { id: 'account', label: 'Аккаунт и Сессия' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-[#242424] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Настройки</h1>
        <p className="text-xs text-[#888888] mt-1">
          VPN обход ограничений, авто-сессия, темы интерфейса и загрузки.
        </p>
      </div>

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'network' && (
        <div className="space-y-6 bg-[#161616] p-6 rounded-lg border border-[#242424]">
          <div className="flex items-start justify-between pb-4 border-b border-[#282828] gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#ff5500]" />
                <span>DNS over HTTPS (Безопасный DoH)</span>
              </h2>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Обходит DNS-блокировки ТСПУ и провайдеров РФ через зашифрованные DNS-серверы (Control D, AdGuard, Cloudflare).
              </p>
            </div>
            <Button
              size="sm"
              variant={dohEnabled ? 'primary' : 'secondary'}
              onClick={handleToggleDoh}
            >
              {dohEnabled ? 'Включено' : 'Выключено'}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Network size={18} className="text-[#ff5500]" />
                  <span>Обнаруженные локальные прокси (Clash Verge / v2rayN / Sing-box)</span>
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  Приложение автоматически сканирует порты ваших клиентов обхода блокировок.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} className={detecting ? 'animate-spin' : ''} />}
                onClick={handleAutoDetectProxy}
              >
                Сканировать
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
                          ? 'bg-[#1e271e] border-emerald-600/70 shadow-sm'
                          : 'bg-[#1b1b1b] border-[#2c2c2c] hover:border-[#3a3a3a]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-[#555]'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{p.name || 'Local Proxy'}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                                Активен
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] font-mono text-[#ff8533] mt-0.5">{p.proxy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestProxy(p.proxy)}
                        >
                          Тест
                        </Button>
                        <Button
                          size="sm"
                          variant={isCurrent ? 'secondary' : 'primary'}
                          onClick={() => handleApplyProxy(p.proxy)}
                        >
                          {isCurrent ? 'Подключен' : 'Подключить'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded bg-[#1b1b1b] border border-[#2a2a2a] text-xs text-[#888888] mb-5">
                Локальные порты прокси не найдены. Если вы используете системный VPN (Amnezia, WireGuard, Outline, TUN), выберите режим <strong>Системный VPN</strong> ниже.
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-[#242424]">
              <label className="text-xs font-semibold text-white">Адрес прокси вручную</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  placeholder="http://127.0.0.1:56234 или socks5://127.0.0.1:10808"
                  className="flex-1 rounded border border-[#2e2e2e] bg-[#121212] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-[#ff5500] focus:outline-none font-mono"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={testingProxy}
                  icon={<Zap size={14} className={testingProxy ? 'animate-spin' : ''} />}
                  onClick={() => handleTestProxy()}
                >
                  Проверить
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleApplyProxy(proxyInput)}>
                  Применить
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  title="Использовать сетевой адаптер Windows / Системный VPN"
                  onClick={() => handleApplyProxy('')}
                >
                  Системный VPN
                </Button>
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 text-xs font-medium p-2.5 rounded border ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                      : 'bg-red-950/40 border-red-800 text-red-400'
                  }`}
                >
                  {testResult.success ? (
                    <>
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span>Соединение с серверами SoundCloud успешно установлено (пинг: {testResult.latency}мс).</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>Не удалось соединиться: {testResult.error || 'Ошибка таймаута'}. Убедитесь, что прокси запущен и включен режим Rule или Global.</span>
                    </>
                  )}
                </div>
              )}

              {proxyStatus && (
                <p className="text-xs text-[#ff5500] font-medium">{proxyStatus}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Palette size={16} className="text-[#ff5500]" />
              <span>Темы оформления (11 пресетов)</span>
            </h2>
            <p className="text-xs text-[#888888] mb-4">
              Выберите цветовую схему для интерфейса плеера.
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

      {activeTab === 'downloads' && (
        <div className="space-y-4 bg-[#161616] p-5 rounded-lg border border-[#242424]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download size={16} className="text-[#ff5500]" />
            <span>Папка для скачивания треков</span>
          </h2>
          <p className="text-xs text-[#888888]">
            Аудиофайлы загружаются в оригинальном качестве без повторного сжатия с тегами и обложками.
          </p>

          <div className="flex items-center gap-3 p-3 rounded bg-[#1e1e1e] border border-[#2a2a2a]">
            <Folder size={18} className="text-[#ff5500] shrink-0" />
            <span className="text-xs font-mono text-[#cccccc] truncate flex-1">
              {downloadFolder}
            </span>
            <Button size="sm" variant="secondary" onClick={handleChooseFolder}>
              Изменить
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpenFolder}>
              Открыть папку
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
                <span>Автообновление и синхронизация сессии</span>
              </h2>
              <p className="text-xs text-[#888888] mt-0.5">
                1-клик синхронизация без необходимости вручную искать токены в DevTools.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              disabled={syncingSession}
              icon={<RefreshCw size={13} className={syncingSession ? 'animate-spin' : ''} />}
              onClick={handleSyncSession}
            >
              Синхронизировать сессию
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
                  Сменить аккаунт
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
                  Выйти
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#888888]">
                Войдите в аккаунт, чтобы слушать свои лайки, историю и стримы.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={onOpenLogin}>
                  Окно входа SoundCloud
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
