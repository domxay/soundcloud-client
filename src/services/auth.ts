import { AuthSession, UserProfile } from '@/types';

const STORAGE_KEY = 'sc_auth_session';
const DEFAULT_CLIENT_ID = 'QhVEWrrJKvW4uSU5u5EoI0FTXYUGzy5k';

export class AuthService {
  private static instance: AuthService;
  private session: AuthSession | null = null;

  private constructor() {
    this.loadSession();
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
  }

  public setUser(user: UserProfile): void {
    if (!this.session) {
      this.session = { oauthToken: '', clientId: DEFAULT_CLIENT_ID };
    }
    this.session.user = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
  }

  public clearSession(): void {
    this.session = {
      oauthToken: '',
      clientId: DEFAULT_CLIENT_ID,
    };
    localStorage.removeItem(STORAGE_KEY);
  }

  public isAuthenticated(): boolean {
    return Boolean(this.session?.oauthToken && this.session.oauthToken.trim().length > 0);
  }
}

export const authService = AuthService.getInstance();
