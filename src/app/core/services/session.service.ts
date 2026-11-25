import { Injectable, signal } from '@angular/core';

/** Fuente única para las claves de sesión usadas por el frontend. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenKey = 'token_monarca';
  private readonly roleKey = 'rol_monarca';

  private readonly revision=signal(0);
  token(): string {
    this.revision();
    return localStorage.getItem(this.tokenKey) || '';
  }

  role(): string {
    return localStorage.getItem(this.roleKey) || '';
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && this.role() === 'ROLE_ADMIN';
  }

  start(token: string, role: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.roleKey, role);
    this.revision.update(x=>x+1);
  }

  clear(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    this.revision.update(x=>x+1);
  }
}
