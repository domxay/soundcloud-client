import { AuthSession, UserProfile } from '@/types';

const STORAGE_KEY = 'sc_auth_session';
export const DEFAULT_CLIENT_ID = 'z7SdppGR2n32vjiLbTeRJnOdA3dFn6Nn';

export class AuthService {
  private static instance: AuthService;
  private session: AuthSession | null = null;
  private listeners: Set<(session: AuthSession) => void> = new Set();
  private refreshingPromise: Promise<string> | null = null;

  private constructor() {
    this.loadSession();
    this.initAutoSync();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
        if (!this.session?.clientId || this.session.clientId === 'QhVEWrrJKvW4uSU5u5EoI0FTXYUGzy5k') {
          this.session = {
            oauthToken: this.session?.oauthToken || '',
            clientId: DEFAULT_CLIENT_ID,
            user: this.session?.user,
          };
          this.persistSession();
        }
      } else {
        this.session = {
          oauthToken: '',
          clientId: DEFAULT_CLIENT_ID,
        };
      }
    } catch {
      this.session = {
        oauthToken: '',
        clientId: DEFAULT_CLIENT_ID,
      };
    }
  }

  private persistSession(): void {
    if (this.session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
      this.notify();
    }
  }

  private notify(): void {
    if (this.session) {
      for (const cb of this.listeners) {
        try {
          cb(this.session);
        } catch {}
      }
    }
  }

  public subscribe(cb: (session: AuthSession) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private async initAutoSync(): Promise<void> {
    if (typeof window === 'undefined') return;
    // 1. Refresh client ID from Electron if available
    try {
      await this.refreshClientId();
    } catch {}

    // 2. If no user token is stored, attempt silent cookie session sync
    if (!this.isAuthenticated() && (window as any).electronAPI?.syncSession) {
      try {
        const syncRes = await (window as any).electronAPI.syncSession();
        if (syncRes && syncRes.success && syncRes.token) {
          this.setSession(syncRes.token, syncRes.clientId);
        }
      } catch {}
    }
  }

  public async refreshClientId(force = false): Promise<string> {
    if (this.refreshingPromise && !force) {
      return this.refreshingPromise;
    }

    this.refreshingPromise = (async () => {
      try {
        if ((window as any).electronAPI?.getClientId) {
          const freshId = await (window as any).electronAPI.getClientId(force);
          if (freshId && typeof freshId === 'string' && freshId.length === 32) {
            if (this.session) {
              this.session.clientId = freshId;
              this.persistSession();
            }
            return freshId;
          }
        }
      } catch {}
      return this.getClientId();
    })();

    const result = await this.refreshingPromise;
    this.refreshingPromise = null;
    return result;
  }

  public async syncSessionFromCookies(): Promise<{ success: boolean; token?: string; error?: string }> {
    if ((window as any).electronAPI?.syncSession) {
      try {
        const res = await (window as any).electronAPI.syncSession();
        if (res && res.success && res.token) {
          this.setSession(res.token, res.clientId);
          return { success: true, token: res.token };
        }
        return { success: false, error: res?.error || 'No active SoundCloud cookies found' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Sync failed' };
      }
    }
    return { success: false, error: 'Desktop integration required for auto-sync' };
  }

  public getSession(): AuthSession {
    if (!this.session) {
      this.loadSession();
    }
    return this.session!;
  }

  public getClientId(): string {
    return this.session?.clientId || DEFAULT_CLIENT_ID;
  }

  public getOAuthToken(): string {
    return this.session?.oauthToken || '';
  }

  public setSession(token: string, clientId?: string, user?: UserProfile): void {
    const cleanToken = token.startsWith('OAuth ') ? token.slice(6) : token;
    this.session = {
      oauthToken: cleanToken,
      clientId: clientId || this.getClientId(),
      user: user || this.session?.user,
    };
    this.persistSession();
  }

  public setUser(user: UserProfile): void {
    if (!this.session) {
      this.session = { oauthToken: '', clientId: DEFAULT_CLIENT_ID };
    }
    this.session.user = user;
    this.persistSession();
  }

  public clearSession(): void {
    this.session = {
      oauthToken: '',
      clientId: this.session?.clientId || DEFAULT_CLIENT_ID,
    };
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  public logout(): void {
    this.clearSession();
  }

  public isAuthenticated(): boolean {
    return Boolean(this.session?.oauthToken && this.session.oauthToken.trim().length > 0);
  }
}

export const authService = AuthService.getInstance();
