import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Cloud,
  User,
  Minus,
  Square,
  X,
  Send,
  Sliders,
  LogOut,
  Upload,
  Settings,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { authService } from '@/services/auth';

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenThemeSettings?: () => void;
}

export default function Header({
  onOpenLogin,
  onOpenThemeSettings,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [proxyInfo, setProxyInfo] = useState<{ active: boolean; name: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const isAuth = authService.isAuthenticated();
  const session = authService.getSession();

  useEffect(() => {
    // Check proxy status
    const updateProxyStatus = async () => {
      if ((window as any).electronAPI?.detectLocalProxy) {
        try {
          const res = await (window as any).electronAPI.detectLocalProxy();
          if (res && res.success) {
            setProxyInfo({ active: true, name: res.name || 'Clash/VPN' });
          } else {
            setProxyInfo({ active: false, name: 'System / Direct' });
          }
        } catch {
          setProxyInfo({ active: false, name: 'Direct' });
        }
      }
    };
    updateProxyStatus();
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const username = session.user?.username || 'User';
  const avatar = session.user?.avatar_url;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/codesand', '_blank');
  };

  const handleUploadClick = () => {
    window.open('https://soundcloud.com/upload', '_blank');
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      const res = await authService.syncSessionFromCookies();
      if (res.success) {
        window.location.reload();
      } else {
        onOpenLogin();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMinimize = () => {
    if ((window as any).electronAPI?.minimizeWindow) {
      (window as any).electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if ((window as any).electronAPI?.maximizeWindow) {
      (window as any).electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if ((window as any).electronAPI?.closeWindow) {
      (window as any).electronAPI.closeWindow();
    }
  };

  const isElectron = Boolean((window as any).electronAPI);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/feed', label: 'Feed' },
    { to: '/library', label: 'Library' },
  ];

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[#222222] bg-[#121212]/95 px-4 select-none backdrop-blur-md"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div
        className="flex items-center gap-2 cursor-pointer shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={() => navigate('/')}
      >
        <Cloud size={28} className="text-[#ff5500]" fill="currentColor" />
        <span className="text-base font-bold tracking-tight text-white hidden sm:inline">
          SoundCloud
        </span>
      </div>

      <nav
        className="flex items-center gap-1 shrink-0 ml-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {navLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'text-[#ff5500] border-b-2 border-[#ff5500]'
                  : 'text-[#999999] hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div
        className="relative flex-1 max-w-sm mx-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tracks, artists... (Press Enter)"
          className="w-full rounded border border-[#2a2a2a] bg-[#1a1a1a] py-1.5 pl-8 pr-12 text-xs text-white placeholder:text-[#666666] focus:border-[#ff5500] focus:outline-none transition-colors"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#333333] bg-[#242424] px-1 py-0.5 text-[9px] font-medium text-[#777777]">
          Enter
        </kbd>
      </div>

      <div
        className="flex items-center gap-2 ml-auto shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {proxyInfo && (
          <button
            onClick={() => navigate('/settings')}
            className={`hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all border ${
              proxyInfo.active
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="VPN & Proxy Route Status — Click to configure"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                proxyInfo.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            <span className="truncate max-w-[130px]">{proxyInfo.name}</span>
          </button>
        )}

        <button
          onClick={handleUploadClick}
          className="hidden lg:flex items-center gap-1 text-xs font-medium text-[#999999] hover:text-white px-2 py-1 rounded transition-colors"
          title="Upload to SoundCloud"
        >
          <Upload size={14} />
          <span>Upload</span>
        </button>

        <button
          onClick={() => {
            if (onOpenThemeSettings) {
              onOpenThemeSettings();
            } else {
              navigate('/settings');
            }
          }}
          className="flex items-center gap-1 rounded border border-[#282828] bg-[#1a1a1a] px-2.5 py-1 text-xs font-semibold text-white hover:border-[#ff5500] hover:text-[#ff5500] transition-all shadow-sm"
          title="Application Settings & Themes"
        >
          <Sliders size={13} className="text-[#ff5500]" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={handleOpenTelegram}
          className="hidden xl:flex items-center gap-1.5 rounded border border-[#282828] bg-[#1a1a1a] px-2.5 py-1 text-xs font-medium text-[#aaaaaa] hover:text-white hover:border-[#444444] transition-all shadow-sm"
          title="Community Channel"
        >
          <Send size={12} className="rotate-[-20deg] text-[#229ED9]" />
          <span>@codesand</span>
        </button>

        {isAuth ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded border border-[#282828] bg-[#1a1a1a] py-1 pl-1 pr-2.5 transition-colors hover:bg-[#242424]"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="h-6 w-6 rounded-full object-cover border border-[#333333]"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#2a2a2a] border border-[#333333] flex items-center justify-center text-white text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium max-w-[80px] truncate">
                {username}
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-10 w-44 rounded border border-[#2a2a2a] bg-[#1c1c1c] py-1 shadow-2xl z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#cccccc] hover:bg-[#282828] hover:text-white flex items-center gap-2"
                  >
                    <User size={14} />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#cccccc] hover:bg-[#282828] hover:text-white flex items-center gap-2"
                  >
                    <Settings size={14} />
                    Settings
                  </button>
                  <div className="my-1 border-t border-[#2a2a2a]" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      authService.logout();
                      window.location.reload();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-red-400 hover:bg-[#282828] font-medium flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="hidden sm:flex items-center gap-1 rounded border border-[#333] bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-semibold text-[#ccc] hover:text-white hover:border-[#ff5500] transition-colors"
              title="1-Click Auto-Sync Session from browser cookies"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin text-[#ff5500]' : ''} />
              <span>Auto-Sync</span>
            </button>
            <button
              onClick={onOpenLogin}
              className="rounded bg-[#ff5500] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#ff6600] active:bg-[#e64d00] transition-colors shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {isElectron && (
        <div
          className="flex items-center border-l border-[#282828] pl-2 gap-0.5 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={handleMinimize}
            className="flex h-7 w-7 items-center justify-center rounded text-[#888888] hover:bg-[#222222] hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-7 w-7 items-center justify-center rounded text-[#888888] hover:bg-[#222222] hover:text-white transition-colors"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[#888888] hover:bg-[#e81123] hover:text-white transition-colors"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </header>
  );
}
