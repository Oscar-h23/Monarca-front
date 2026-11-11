import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, inject, signal, NgZone } from '@angular/core';
import { GoogleIdentityService } from '../core/services/google-identity.service';

@Component({
  selector: 'app-google-button',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="flex flex-col items-center gap-2">
    <div #buttonHost class="min-h-10 flex justify-center"></div>
    <p *ngIf="notice()" class="text-xs text-zinc-500 text-center" role="status">{{notice()}}</p>
  </div>`
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  @Output() credential = new EventEmitter<string>();
  @ViewChild('buttonHost', { static: true }) host!: ElementRef<HTMLElement>;
  private identity = inject(GoogleIdentityService);
  private zone = inject(NgZone);
  notice = signal('');
  private readonly received = (token: string) => this.zone.run(() => this.credential.emit(token));

  async ngAfterViewInit() {
    try {
      if (!await this.identity.render(this.host.nativeElement, this.received)) {
        this.notice.set('Acceso con Google pendiente de configuración.');
      }
    } catch {
      this.notice.set('Google no está disponible en este momento.');
    }
  }
  ngOnDestroy() { this.identity.dispose(this.received); }
}
