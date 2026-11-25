import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { FavoritosService } from '../../core/services/favoritos.service';
import { Producto } from '../../core/models/shop.models';
import { FavoritoButtonComponent } from '../../shared/favorito-button.component';
import { asset } from '../../core/utils/assets';

@Component({standalone:true,imports:[CommonModule,RouterLink,FavoritoButtonComponent],templateUrl:'./favoritos.html'})
export class FavoritosPage implements OnInit {
 readonly favoritos=inject(FavoritosService);
 private api=inject(Api);
 readonly catalogo=signal<Producto[]>([]);
 readonly cargando=signal(true);
 readonly error=signal('');
 readonly fallback=asset('mariposa.png');
 readonly productos=computed(()=>this.catalogo().filter(p=>this.favoritos.esFavorito(p.idProducto)));
 ngOnInit(){void this.cargar();}
 async cargar(){
   this.cargando.set(true);this.error.set('');
   try{const [productos]=await Promise.all([this.api.productos(true),this.favoritos.refrescar()]);this.catalogo.set(productos);}
   catch{this.error.set('No se pudo actualizar el catálogo de favoritos.');}
   finally{this.cargando.set(false);}
 }
 descuento(a:{precioAnterior:number;precioNuevo:number}){return a.precioAnterior>0?100*(a.precioAnterior-a.precioNuevo)/a.precioAnterior:0;}
}
