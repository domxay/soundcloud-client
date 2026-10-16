import { Search, Cloud, User, Minus, Square, X, Send, Palette, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authService } from '@/services/auth';

const navTabs = ['Home', 'Stream', 'Library', 'Playlists', 'Likes', 'Downloads', 'Profile'];

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenThemeSettings: () => void;
  onSearch: (query: string) => void;
}

export default function Header({
  activeTab,
  onTabChange,
  onOpenLogin,
  onOpenThemeSettings,
  onSearch,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const isAuth = authService.isAuthenticated();
  const session = authService.getSession();

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
    if (e.key === 'Enter') {
      onSearch(searchInput);
    }
  };

  const handleOpenTelegram = () => {
    window.open('https://t.me/codesand', '_blank');
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

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sc-border bg-sc-bg/90 px-4 select-none backdrop-blur-md"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div
        className="flex items-center gap-2.5 cursor-pointer shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={() => onTabChange('Home')}
      >
        <Cloud size={28} className="text-sc-accent" fill="currentColor" />
        <span className="text-base font-bold tracking-tight text-white">SoundCloud</span>
      </div>

      <div
        className="relative flex-1 max-w-sm mx-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sc-text-secondary" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tracks, artists... (Press Enter)"
          className="w-full rounded-sc border border-sc-border bg-sc-surface py-1.5 pl-9 pr-14 text-xs text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none transition-colors"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sc border border-sc-border bg-sc-hover px-1 py-0.5 text-[9px] font-medium text-sc-text-secondary">
          Enter
        </kbd>
      </div>

      <nav
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {navTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`rounded-sc px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-sc-accent border-b-2 border-sc-accent font-semibold'
                : 'text-sc-text-secondary hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div
        className="flex items-center gap-2 ml-auto"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={onOpenThemeSettings}
          className="flex items-center gap-1 rounded-sc border border-sc-border bg-sc-surface px-2.5 py-1 text-xs font-semibold text-white hover:border-sc-accent hover:text-sc-accent transition-all shadow-sm"
          title="Themes & Network Studio"
        >
          <Palette size={13} className="text-sc-accent" />
          <span>Themes</span>
        </button>

        <button
          onClick={handleOpenTelegram}
          className="flex items-center gap-1.5 rounded-sc border border-[#229ED9]/40 bg-[#229ED9]/10 px-2.5 py-1 text-xs font-semibold text-[#229ED9] hover:bg-[#229ED9] hover:text-white transition-all shadow-sm"
          title="Author Telegram Channel"
        >
          <Send size={12} className="rotate-[-20deg]" />
          <span>@codesand</span>
        </button>

        {isAuth ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface py-1 pl-1 pr-2.5 transition-colors hover:bg-sc-hover"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="h-7 w-7 rounded-full object-cover border border-sc-border"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-sc-hover border border-sc-border flex items-center justify-center text-white text-xs font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium max-w-[90px] truncate">{username}</span>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-11 w-44 rounded-sc border border-sc-border bg-sc-surface py-1 shadow-2xl z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onTabChange('Profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-sc-text-secondary hover:bg-sc-hover hover:text-white flex items-center gap-2"
                  >
                    <User size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenThemeSettings();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-sc-text-secondary hover:bg-sc-hover hover:text-white flex items-center gap-2"
                  >
                    <Palette size={14} />
                    Themes & Network
                  </button>
                  <div className="my-1 border-t border-sc-border" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-red-400 hover:bg-sc-hover font-medium flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Account / Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="rounded-sc bg-sc-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-sm"
          >
            Sign In
          </button>
        )}
      </div>

      {isElectron && (
        <div
          className="flex items-center border-l border-sc-border pl-2 gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={handleMinimize}
            className="flex h-7 w-8 items-center justify-center rounded-sc text-sc-text-secondary hover:bg-sc-hover hover:text-white transition-colors"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-7 w-8 items-center justify-center rounded-sc text-sc-text-secondary hover:bg-sc-hover hover:text-white transition-colors"
          >
            <Square size={11} />
          </button>
          <button
            onClick={handleClose}
            className="flex h-7 w-8 items-center justify-center rounded-sc text-sc-text-secondary hover:bg-red-600 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </header>
  );
}
