import { useState, useEffect } from 'react';
import { X, Cloud, Key, Check, LogOut, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { authService } from '@/services/auth';
import { soundcloudApi } from '@/services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const session = authService.getSession();
  const [token, setToken] = useState(session.oauthToken || '');
  const [clientId, setClientId] = useState(session.clientId || '');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAutoSync = async () => {
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
        setError(res.error || 'Сессия не найдена. Нажмите «Войти через браузерное окно».');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка авто-синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSave = async () => {
    if (!token.trim()) {
      setError('Пожалуйста, введите корректный OAuth токен.');
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
      setError('Не удалось подключиться. Проверьте OAuth токен или настройки VPN/прокси.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebviewLogin = async () => {
    if ((window as any).electronAPI?.openLoginWindow) {
      setLoading(true);
      setError('');
      try {
        const result = await (window as any).electronAPI.openLoginWindow();
        if (result.success && result.token) {
          authService.setSession(result.token, result.clientId);
          const user = await soundcloudApi.getCurrentUser();
          if (user) authService.setUser(user);
          onLoginSuccess();
          onClose();
        } else {
          setError(result.error || 'Авторизация отменена пользователем');
        }
      } catch (err: any) {
        setError(err.message || 'Ошибка входа');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Браузерный вход доступен в настольной версии приложения.');
    }
  };

  const handleLogout = () => {
    authService.clearSession();
    setToken('');
    onLoginSuccess();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-sc border border-sc-border bg-sc-surface p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-sc-text-secondary hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <Cloud size={32} className="text-sc-accent" fill="currentColor" />
          <div>
            <h2 className="text-lg font-bold text-white">Вход в аккаунт SoundCloud</h2>
            <p className="text-xs text-sc-text-secondary">Синхронизация лайков, плейлистов и стрима</p>
          </div>
        </div>

        {authService.isAuthenticated() && (
          <div className="mb-5 rounded-sc bg-[#162a1b] border border-[#2b5934] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-[#3ed465]" />
              <span className="text-sm text-[#a4efb7]">
                Вы вошли как <strong className="text-white">{session.user?.username || 'Пользователь'}</strong>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
            >
              <LogOut size={14} />
              Выйти
            </button>
          </div>
        )}

        {detectedProxy && (
          <div className="mb-4 rounded-sc bg-sc-bg border border-sc-border p-3 text-xs flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium">Обнаружен обход блокировок: {detectedProxy.name}</p>
              <p className="text-[11px] text-sc-text-secondary mt-0.5 leading-snug">
                Если SoundCloud недоступен, включите Clash Verge в режим <strong>Rule</strong> или <strong>Global</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3.5">
          <button
            onClick={handleAutoSync}
            disabled={syncing || loading}
            className="w-full flex items-center justify-center gap-2 rounded-sc bg-emerald-600/90 hover:bg-emerald-500 py-2.5 px-4 text-sm font-bold text-white transition-all disabled:opacity-50 shadow-md"
          >
            <Sparkles size={16} />
            <span>{syncing ? 'Синхронизация сессии...' : '1-Клик Авто-Синхронизация (из куков)'}</span>
          </button>

          <button
            onClick={handleWebviewLogin}
            disabled={loading || syncing}
            className="w-full flex items-center justify-center gap-2 rounded-sc bg-sc-accent py-2.5 px-4 text-sm font-bold text-white transition-colors hover:bg-sc-accent-hover disabled:opacity-50 shadow-md"
          >
            <Cloud size={18} fill="white" />
            <span>Войти через официальное окно SoundCloud</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-sc-border" />
            <span className="text-[11px] text-sc-text-secondary uppercase">Или ручной ввод токена</span>
            <div className="flex-1 h-px bg-sc-border" />
          </div>

          <div>
            <label className="block text-xs font-medium text-sc-text-secondary mb-1">OAuth Token</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sc-text-secondary" />
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="OAuth 2-xxxx или JWT токен"
                className="w-full rounded-sc border border-sc-border bg-sc-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-sc-text-secondary mb-1">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="SoundCloud client_id"
              className="w-full rounded-sc border border-sc-border bg-sc-bg py-2 px-3 text-sm text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none font-mono text-xs"
            />
          </div>

          {error && <p className="text-xs text-red-400 mt-2 font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-sc border border-sc-border px-4 py-2 text-sm text-sc-text-secondary hover:text-white hover:bg-sc-hover"
            >
              Отмена
            </button>
            <button
              onClick={handleManualSave}
              disabled={loading || syncing}
              className="rounded-sc bg-sc-surface border border-sc-accent px-5 py-2 text-sm font-semibold text-sc-accent hover:bg-sc-accent hover:text-white transition-colors disabled:opacity-50"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
