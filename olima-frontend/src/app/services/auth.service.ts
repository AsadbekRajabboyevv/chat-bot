import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse } from '../models';

export const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: LoginResponse | null = null;

  constructor(private apiService: ApiService, private router: Router) {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        this.currentUser = null;
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.login(credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('selectedOrgId');
    this.currentUser = null;
    // Boshqa navigatsiya (masalan, tashkilot almashtirish) tugamagan bo'lsa router o'tishni bekor qilishi
    // mumkin — foydalanuvchi panelda qolib ketmasin: o'tolmasa sahifani to'liq /login ga yuklaymiz.
    this.router.navigateByUrl('/login', { replaceUrl: true })
      .then(ok => { if (!ok && !location.pathname.startsWith('/login')) location.assign('/login'); })
      .catch(() => location.assign('/login'));
  }

  private setSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response));
    this.currentUser = response;

    if (response.organizationId) {
      localStorage.setItem('selectedOrgId', response.organizationId);
      window.dispatchEvent(new Event('orgChanged'));
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): LoginResponse | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser;
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'SUPER_ADMIN';
  }

  isOrgAdmin(): boolean {
    return this.currentUser?.role === 'ORG_ADMIN';
  }
}
