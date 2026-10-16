import { useState } from 'react';
import { X, Cloud, Key, Check, LogOut } from 'lucide-react';
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
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleManualSave = async () => {
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
      setError('Failed to connect. Verify your OAuth token.');
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
          setError(result.error || 'Authentication cancelled');
        }
      } catch (err: any) {
        setError(err.message || 'Login failed');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Browser login requires desktop Electron mode. You can paste your OAuth token below.');
    }
  };

  const handleLogout = () => {
    authService.clearSession();
    setToken('');
    onLoginSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-sc border border-sc-border bg-sc-surface p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-sc-text-secondary hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Cloud size={32} className="text-sc-accent" fill="#ff5500" />
          <div>
            <h2 className="text-lg font-bold text-white">SoundCloud Account</h2>
            <p className="text-xs text-sc-text-secondary">Client by domxay</p>
          </div>
        </div>

        {authService.isAuthenticated() && (
          <div className="mb-6 rounded-sc bg-[#162a1b] border border-[#2b5934] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-[#3ed465]" />
              <span className="text-sm text-[#a4efb7]">
                Logged in as <strong className="text-white">{session.user?.username || 'User'}</strong>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleWebviewLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-sc bg-sc-accent py-2.5 px-4 text-sm font-bold text-white transition-colors hover:bg-sc-accent-hover disabled:opacity-50"
          >
            <Cloud size={18} fill="white" />
            Sign in with SoundCloud
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-sc-border" />
            <span className="text-xs text-sc-text-secondary uppercase">or OAuth Token</span>
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
                placeholder="OAuth 2-xxxx or JWT"
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
              className="w-full rounded-sc border border-sc-border bg-sc-bg py-2 px-3 text-sm text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-sc border border-sc-border px-4 py-2 text-sm text-sc-text-secondary hover:text-white hover:bg-sc-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleManualSave}
              disabled={loading}
              className="rounded-sc bg-sc-surface border border-sc-accent px-5 py-2 text-sm font-semibold text-sc-accent hover:bg-sc-accent hover:text-white transition-colors disabled:opacity-50"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
