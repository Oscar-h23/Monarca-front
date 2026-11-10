import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Cart } from '../../core/services/cart.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';
import { SessionService } from '../../core/services/session.service';
import { PerfilApi, Perfil } from '../../core/services/perfil-api.service';
import { RecomendacionTalla, recomendarTalla, tieneMedidas } from '../../core/utils/recomendar-talla';

@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./product.html'})
export class ProductComponent implements OnInit {
  api=inject(Api);
  cart=inject(Cart);
  route=inject(ActivatedRoute);
  session=inject(SessionService);
  perfilApi=inject(PerfilApi);
  product=signal<Producto|null>(null);
  selected=signal<Variante|null>(null);
  perfil=signal<Perfil|null>(null);
  recomendacion=signal<RecomendacionTalla|null>(null);
  message=signal('');
  error=signal('');
  fallback=asset('mariposa.png');

  available(p:Producto){return(p.variantes||[]).filter(v=>v.stock>0);}
  hasBodyMeasurements(){return tieneMedidas(this.perfil());}
  hasGarmentMeasurements(p:Producto) {
    return (p.variantes||[]).some(v=>
      v.pechoCm!=null||v.cinturaCm!=null||v.caderaCm!=null);
  }
  async ngOnInit(){
    const id=Number(this.route.snapshot.paramMap.get('id'));
    if(!Number.isSafeInteger(id)||id<=0){this.error.set('Producto inválido');return;}
    try{
      const producto=await this.api.producto(id);
      this.product.set(producto);
      if(this.session.isAuthenticated()){
        try{
          const perfil=await this.perfilApi.obtener();
          this.perfil.set(perfil);
          this.recomendacion.set(recomendarTalla(producto,perfil));
        }catch{
          // Mostrar catálogo aunque la sesión haya expirado o el perfil no esté disponible.
        }
      }
    }catch{
      this.error.set('No se pudo obtener el producto.');
    }
  }
  seleccionarRecomendada(){
    const opcion=this.recomendacion();
    if(opcion)this.selected.set(opcion.variante);
  }
  add(p:Producto){
    const v=this.selected();
    if(!v)return;
    this.message.set(this.cart.add(p,v)?'Producto agregado a la bolsa.':'No hay stock suficiente.');
  }
}
