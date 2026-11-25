import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FavoritosService } from '../core/services/favoritos.service';
@Component({
 standalone:true,selector:'app-favorito-button',imports:[CommonModule],
 template:`
  <button type="button" (click)="favoritos.alternar(idProducto)" [disabled]="favoritos.ocupado()||favoritos.cargando()"
    [attr.aria-pressed]="favoritos.esFavorito(idProducto)" [attr.aria-label]="favoritos.esFavorito(idProducto)?'Quitar de favoritos':'Guardar en favoritos'"
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#795b4b] shadow-sm">
    <svg viewBox="0 0 24 24" [attr.fill]="favoritos.esFavorito(idProducto)?'currentColor':'none'" stroke="currentColor" stroke-width="1.6" class="size-5" aria-hidden="true"><path d="M20.8 8.6c0 4.3-8.8 10-8.8 10S3.2 12.9 3.2 8.6a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7Z"/></svg>
    <span *ngIf="conTexto">{{favoritos.esFavorito(idProducto)?'En favoritos':'Guardar en favoritos'}}</span>
  </button>
 `
})
export class FavoritoButtonComponent {
 @Input({required:true}) idProducto!:number;
 @Input() conTexto=false;
 readonly favoritos=inject(FavoritosService);
}
