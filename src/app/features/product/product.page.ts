import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Cart } from '../../core/services/cart.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';
import { SessionService } from '../../core/services/session.service';
import { PerfilApi, Perfil } from '../../core/services/perfil-api.service';
import { RecomendacionTalla, recomendarTalla, tieneMedidas } from '../../core/utils/recomendar-talla';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./product.html'})
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
  complementos=signal<Array<{idProducto:number;nombre:string;precioDesde:number;confianza:number;lift:number}>>([]);
  fuenteComplementos=signal<'PRUEBA'|'REALES'|null>(null);
  catalogo=signal<Producto[]>([]);
  tallasComplemento=signal<Record<number,number>>({});
  mensajeAgregadoComplemento=signal('');
  productoComplemento(id:number):Producto|undefined {
    return this.catalogo().find(p=>p.idProducto===id);
  }
  variantesComplemento(id:number):Variante[] {
    return (this.productoComplemento(id)?.variantes||[]).filter(v=>v.stock>0);
  }
  elegirComplemento(id:number,varianteId:number) {
    this.tallasComplemento.update(xs=>({...xs,[id]:Number(varianteId)}));
    this.mensajeAgregadoComplemento.set('');
  }
  agregarComplemento(id:number) {
    const producto=this.productoComplemento(id);
    const varianteId=this.tallasComplemento()[id];
    const variante=producto?.variantes?.find(v=>v.idVariante===varianteId&&v.stock>0);
    if(!producto||!variante) {
      this.mensajeAgregadoComplemento.set('Elige una talla disponible antes de añadir.');
      return;
    }
    if(this.cart.add(producto,variante,1)){
      this.mensajeAgregadoComplemento.set(producto.nombre+' añadido a tu bolsa.');
    } else {
      this.mensajeAgregadoComplemento.set('No hay suficiente stock de la variante seleccionada.');
    }
  }

  cargandoComplementos=signal(false);
  mensajeComplementos=signal('');

  message=signal('');
  added=signal(false);
  quantity=signal(1);
  error=signal('');
  fallback=asset('mariposa.png');

  available(p:Producto){return(p.variantes||[]).filter(v=>v.stock>0);}
  hasBodyMeasurements(){return !!this.product() && tieneMedidas(this.perfil(),this.product()!.categoria);}
  hasGarmentMeasurements(p:Producto) {
    return (p.variantes||[]).some(v=>
      v.pechoCm!=null||v.cinturaCm!=null||v.caderaCm!=null);
  }
  ngOnInit(){
    this.route.paramMap.subscribe(params=>{
      void this.cargarProducto(Number(params.get('id')));
    });
  }
  private async cargarProducto(id:number){
    this.error.set('');
    this.product.set(null);
    this.selected.set(null);
    this.recomendacion.set(null);
    this.complementos.set([]);
    this.catalogo.set([]);
    this.tallasComplemento.set({});
    this.mensajeAgregadoComplemento.set('');
    this.fuenteComplementos.set(null);
    this.mensajeComplementos.set('');
    if(!Number.isSafeInteger(id)||id<=0){this.error.set('Producto inválido');return;}
    try{
      const producto=await this.api.producto(id);
      this.product.set(producto);
      this.cargandoComplementos.set(true);
      try {
        const [res, catalogo] = await Promise.all([
          this.api.complementos(id),
          this.api.productos()
        ]);
        this.catalogo.set(catalogo);
        this.complementos.set(res.recomendaciones);
        this.fuenteComplementos.set(res.fuente);
        this.mensajeComplementos.set(res.mensaje);
      } catch {
        this.mensajeComplementos.set('No fue posible consultar las sugerencias complementarias.');
      } finally {
        this.cargandoComplementos.set(false);
      }
      if(this.session.isAuthenticated()){
        try{
          const perfil=await this.perfilApi.obtener();
          this.perfil.set(perfil);
          // Respaldo local transparente cuando ML aún no esté desplegado.
          this.recomendacion.set(recomendarTalla(producto,perfil));
          try {
            const remota=await this.api.recomendarTalla(id);
            if(remota.experimental && !remota.disponible) {
              // No sustituir una negativa del ML por una falsa predicción heurística.
              this.recomendacion.set(null);
            }
            if(remota.disponible && remota.idVariante) {
              const variante=producto.variantes?.find(v=>v.idVariante===remota.idVariante && v.stock>0);
              if(variante && remota.holgurasCm) {
                const dimensiones=Object.keys(remota.holgurasCm);
                const cuerpo:Record<string,number|null>={pecho:perfil.bustoCm,cintura:perfil.cinturaCm,cadera:perfil.caderaCm};
                const prenda:Record<string,number|null|undefined>={pecho:variante.pechoCm,cintura:variante.cinturaCm,cadera:variante.caderaCm};
                const detalle=dimensiones.map(nombre=>({
                  nombre,cuerpoCm:cuerpo[nombre]??0,prendaCm:prenda[nombre]??0,
                  holguraCm:remota.holgurasCm![nombre]
                }));
                if(detalle.length && detalle.every(x=>x.cuerpoCm>0 && x.prendaCm>0 && (remota.metodo==='supervisado' || x.holguraCm>=2))) {
                  this.recomendacion.set({
                    variante,medidasComparadas:dimensiones,detalle,tipo:remota.metodo==='supervisado'?'SUPERVISADO':'REGLAS',
                    holguraPromedioCm:detalle.reduce((n,x)=>n+x.holguraCm,0)/detalle.length
                  });
                }
              }
            }
          } catch {
            // Si Railway ML no responde, conservar la recomendación local.
          }
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
    if(opcion)this.selectVariant(opcion.variante);
  }
  selectVariant(v:Variante){
    this.selected.set(v);
    this.quantity.set(1);
    this.message.set('');
    this.added.set(false);
  }
  setQuantity(value:string){
    const v=this.selected();
    if(!v)return;
    const number=Number(value);
    this.quantity.set(Number.isSafeInteger(number)?Math.max(1,Math.min(v.stock,number)):1);
  }
  changeQuantity(delta:number){
    this.setQuantity(String(this.quantity()+delta));
  }
  add(p:Producto){
    const v=this.selected();
    if(!v)return;
    const count=this.quantity();
    if(this.cart.add(p,v,count)){
      this.message.set('');
      this.added.set(true);
    }else{
      this.added.set(false);
      this.message.set('No hay stock suficiente para la cantidad seleccionada.');
    }
  }
}
