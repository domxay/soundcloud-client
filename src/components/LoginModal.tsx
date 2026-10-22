import { useState, useEffect } from 'react';
import { X, Cloud, Key, Check, LogOut, ShieldCheck, RefreshCw, Lock, Sparkles, ExternalLink } from 'lucide-react';
import { authService } from '@/services/auth';
import { soundcloudApi } from '@/services/api';
import { useI18n } from '@/services/i18n';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  required?: boolean;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess, required = false }: LoginModalProps) {
  const { t } = useI18n();
  const session = authService.getSession();
  const [token, setToken] = useState(session.oauthToken || '');
  const [clientId, setClientId] = useState(session.clientId || '');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [detectedProxy, setDetectedProxy] = useState<{ success: boolean; proxy?: string; name?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (window.electronAPI?.detectLocalProxy) {
      window.electronAPI.detectLocalProxy().then((res) => {
        if (res && res.success) {
          setDetectedProxy(res);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !required) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, required]);

  if (!isOpen) return null;

  const handleBrowserLogin = async () => {
    if (window.electronAPI?.openLoginWindow) {
      setLoading(true);
      setError('');
      try {
        const result = await window.electronAPI.openLoginWindow();
        if (result.success && result.token) {
          authService.setSession(result.token, result.clientId);
          const user = await soundcloudApi.getCurrentUser();
          if (user) authService.setUser(user);
          onLoginSuccess();
          onClose();
        } else {
          setError(result.error || 'Окно авторизации было закрыто.');
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка подключения к серверу авторизации.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Официальное окно входа доступно в настольном приложении.');
    }
  };

  const handleSyncSession = async () => {
    setSyncing(true);
    setError('');
    try {
      const res = await authService.syncSessionFromCookies();
      if (res.success && res.token) {
        const user = await soundcloudApi.getCurrentUser();
        if (user) authService.setUser(user);
        onLoginSuccess();
        onClose();
      } else {
        setError(res.error || 'Активная сессия не обнаружена. Воспользуйтесь входом через браузер.');
      }
    } catch (err: any) {
      setError(err?.message || 'Не удалось синхронизировать сессию.');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSave = async () => {
    if (!token.trim()) {
      setError('Введите действительный токен авторизации SoundCloud (OAuth Token).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      authService.setSession(token, clientId);
      const user = await soundcloudApi.getCurrentUser();
      if (user) {
        authService.setUser(user);
      }
      onLoginSuccess();
      onClose();
    } catch {
      setError('Не удалось подтвердить токен. Проверьте правильность ключа или статус VPN/прокси.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.clearSession();
    setToken('');
    onLoginSuccess();
    onClose();
  };

  const isAuth = authService.isAuthenticated();

  return (
    <div
      onClick={() => {
        if (!required) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl text-white"
      >
        {!required && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            title={t('cancel')}
          >
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5500] to-[#e64400] flex items-center justify-center shadow-lg shadow-[#ff5500]/20 shrink-0">
            <Cloud size={28} className="text-white" fill="white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">{t('loginToSoundCloud')}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t('loginDescription')}
            </p>
          </div>
        </div>

        {/* Authenticated Banner */}
        {isAuth && (
          <div className="mb-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check size={14} />
              </div>
              <span className="text-xs text-emerald-300">
                {t('authorizedAs')} <strong className="text-white">{session.user?.username || 'SoundCloud User'}</strong>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              <LogOut size={13} />
              <span>{t('logout')}</span>
            </button>
          </div>
        )}

        {/* Required Notification Banner */}
        {!isAuth && (
          <div className="mb-4 rounded-xl bg-[#201510] border border-[#ff5500]/30 p-3 flex items-start gap-2.5 text-xs">
            <Lock size={15} className="text-[#ff5500] shrink-0 mt-0.5" />
            <div className="text-zinc-300 leading-snug">
              {t('loginNotice')}
            </div>
          </div>
        )}

        {/* Proxy notification if detected */}
        {detectedProxy && (
          <div className="mb-4 rounded-xl bg-zinc-900/90 border border-white/5 p-3 text-xs flex items-start gap-2.5">
            <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium">{t('connectionRoute')}: {detectedProxy.name}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleBrowserLogin}
            disabled={loading || syncing}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6600] active:scale-[0.99] py-3 px-4 text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg shadow-[#ff5500]/25"
          >
            <Cloud size={18} fill="white" />
            <span>{loading ? t('connecting') : t('browserLogin')}</span>
          </button>

          <button
            onClick={handleSyncSession}
            disabled={syncing || loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 active:scale-[0.99] py-2.5 px-4 text-xs font-semibold text-zinc-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-[#ff5500]' : 'text-zinc-400'} />
            <span>{syncing ? t('connecting') : t('cookiesSync')}</span>
          </button>

          {/* Collapsible Manual Credentials */}
          <div className="pt-2">
            <button
              onClick={() => setShowManual(!showManual)}
              type="button"
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 flex items-center justify-center gap-1.5"
            >
              <span>{showManual ? t('hideManualLogin') : t('tokenLogin')}</span>
            </button>

            {showManual && (
              <div className="mt-3 space-y-3 pt-3 border-t border-white/10 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">OAuth Token</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={t('tokenPlaceholder')}
                      className="w-full rounded-lg border border-white/10 bg-zinc-900/90 py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-[#ff5500] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="SoundCloud client_id"
                    className="w-full rounded-lg border border-white/10 bg-zinc-900/90 py-2 px-3 text-xs text-white placeholder:text-zinc-600 focus:border-[#ff5500] focus:outline-none font-mono text-[11px] transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleManualSave}
                    disabled={loading || syncing}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-[#ff5500]/40 px-4 py-1.5 text-xs font-bold text-[#ff5500] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {t('applyToken')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-2 font-medium bg-red-950/30 border border-red-900/50 rounded-lg p-2.5">
              {error}
            </p>
          )}

          {!required && (
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
              >
                {t('continueWithoutLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
