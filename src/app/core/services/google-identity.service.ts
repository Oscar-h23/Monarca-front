import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface GoogleCredential { credential?: string }
interface GoogleIdentityApi {
  initialize(config: { client_id: string; callback: (result: GoogleCredential) => void }): void;
  renderButton(element: HTMLElement, config: { theme: string; size: string; text: string; width: number }): void;
}
interface GoogleWindow extends Window { google?: { accounts: { id: GoogleIdentityApi } } }

/** Carga GIS solo desde Google y entrega el ID token al backend para validación. */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private http = inject(HttpClient);
  private loadPromise?: Promise<GoogleIdentityApi>;
  private clientIdPromise?: Promise<string>;
  private initialized = false;
  private activeReceiver?: (credential: string) => void;

  private async clientId(): Promise<string> {
    this.clientIdPromise ??= firstValueFrom(
      this.http.get<{ clientId: string }>('/api/auth/google/configuracion')
    ).then(r => r.clientId || '');
    return this.clientIdPromise;
  }

  private google(): Promise<GoogleIdentityApi> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = new Promise((resolve, reject) => {
      const current = (window as GoogleWindow).google?.accounts?.id;
      if (current) { resolve(current); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        const api = (window as GoogleWindow).google?.accounts?.id;
        api ? resolve(api) : reject(new Error('No se pudo inicializar Google.'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar el acceso de Google.'));
      document.head.appendChild(script);
    }).catch(error => { this.loadPromise = undefined; throw error; });
    return this.loadPromise;
  }

  async render(element: HTMLElement, receiver: (credential: string) => void): Promise<boolean> {
    const clientId = await this.clientId();
    if (!clientId) return false;
    const gis = await this.google();
    this.activeReceiver = receiver;
    if (!this.initialized) {
      gis.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credential) this.activeReceiver?.(credential);
        }
      });
      this.initialized = true;
    }
    element.replaceChildren();
    gis.renderButton(element, { theme: 'outline', size: 'large', text: 'continue_with', width: 300 });
    return true;
  }

  dispose(receiver: (credential: string) => void): void {
    if (this.activeReceiver === receiver) this.activeReceiver = undefined;
  }
}
