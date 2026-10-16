import { AuthSession, UserProfile } from '@/types';

const STORAGE_KEY = 'sc_auth_session';
const DEFAULT_CLIENT_ID = 'QhVEWrrJKvW4uSU5u5EoI0FTXYUGzy5k';
const INITIAL_TOKEN = 'eyJraWQiOiJzYy16Z0xnWUJnIiwidHlwIjoiYXQrSldUIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJzb3VuZGNsb3VkOnVzZXJzOjE3NjQ2NTkxMDMiLCJhdWQiOiJodHRwczovL3NvdW5kY2xvdWQuY29tIiwic2NvcGUiOiIqIGZhc3QtY29ubmVjdCBwbGF5Y291bnQgcHVyY2hhc2Ugc2lnbnVwIHVwbG9hZCIsImlzcyI6Imh0dHBzOi8vc2VjdXJlLnNvdW5kY2xvdWQuY29tIiwiY2FpIjoiNDY5NDEiLCJleHAiOjE3OTIxNTMyNDYsImlhdCI6MTc5MjA2Njg0NiwianRpIjoiODM2YzVkNjktNTBlZS00NjY1LTlmOTctYzE4NDBmYzEzYmFiIiwiY2xpZW50X2lkIjoiUWhWRVdyckpLdlc0dVNVNXU1RW9JMEZUWFlVR3p5NWsiLCJzaWQiOiIwMU00WlIzWVRBM1cwVzlXMVhFMlZDNlI2WCJ9.GQKDCs8OI6pFL1cD9Tzaj24Tf-sTKE4M5cAyPC9tePRYEKrHhRIo8D1mdK7Nz17nJCUnACOyZ0lgdt4JZgR-HCXpwoUu8RUU43iRdLu9kh4EE4ylQqBf3U74QjQiU6phJT0ceWBD959hhdWw3JUC5qWvu45eN53c6JYVNBXvZ0ZDxbMvfagIeLdwqUDEoI8BLYZlyCh5OvfTtl7EjxCqgBpB-i3D4qjtrNCtr-6TWb3cgpGT9ibhSJIipR029eZUhmiyvRu2BLLsNs3vWgvzAmMtIXgfKz1_sC5_fsfZz47pgztmcSxEhVuHM5A-QsdIaXVqpuwu8AnLZStiQZSFVw';

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
          oauthToken: INITIAL_TOKEN,
          clientId: DEFAULT_CLIENT_ID,
          user: {
            id: 1764659103,
            username: 'domxay',
            avatar_url: 'https://images.pexels.com/photos/7446857/pexels-photo-7446857.jpeg?auto=compress&cs=tinysrgb&h=80&w=80',
          },
        };
      }
    } catch {
      this.session = {
        oauthToken: INITIAL_TOKEN,
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
    return Boolean(this.session?.oauthToken);
  }
}

export const authService = AuthService.getInstance();
