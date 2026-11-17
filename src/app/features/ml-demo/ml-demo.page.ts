import {CommonModule} from '@angular/common';
import {Component,OnInit,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {Api} from '../../core/services/api.service';
import {Cart} from '../../core/services/cart.service';
import {AdminApi, EjecucionAcademica, FuenteMlInfo, ModuloMl} from '../admin/data-access/admin-api.service';
import {Producto} from '../../core/models/shop.models';
import {CampanasDemoComponent} from '../admin/campanas-demo/campanas-demo.component';

type Complemento={idProducto:number;nombre:string;precioDesde:number;confianza:number;lift:number};
@Component({
 standalone:true,selector:'app-ml-demo',
 imports:[CommonModule,FormsModule,RouterLink,CampanasDemoComponent],
 templateUrl:'./ml-demo.html'
})
export class MlDemoPage implements OnInit {
 private readonly api=inject(Api);
 readonly carrito=inject(Cart);
 private readonly admin=inject(AdminApi);
 productos=signal<Producto[]>([]);
 fuentes=signal<FuenteMlInfo[]>([]);
 resultados=signal<EjecucionAcademica[]>([]);
 cargando=signal(true);
 trabajando=signal('');
 error=signal('');
 mensaje=signal('');
 mensajeOutfit=signal('');
 seleccionado=2;
 presupuesto=180;
 complementos=signal<Complemento[]>([]);
 fuenteComplementos=signal<'REALES'|'PRUEBA'|null>(null);
 cestas=signal(0);
 fuente(modulo:ModuloMl):FuenteMlInfo|undefined{return this.fuentes().find(x=>x.modulo===modulo);}
 resultado(modulo:'CLUSTERING'|'DEMANDA'|'OUTFITS'):EjecucionAcademica|undefined{
   return this.resultados().find(x=>x.modulo===modulo);
 }
  variantesOutfit():Array<{producto:Producto;variante:NonNullable<Producto['variantes']>[number]}> {
    const ids=this.resultado('OUTFITS')?.resultado.a_estrella?.combinacion?.id_variantes??[];
    return ids.flatMap(id=>this.productos().flatMap(producto=>
       (producto.variantes??[]).filter(variante=>variante.idVariante===id).map(variante=>({producto,variante}))
    ));
  }
  costoActualOutfit():number {
    return this.variantesOutfit().reduce((total,x)=>total+Number(x.variante.precio),0);
  }
  agregarOutfit():void {
    this.mensajeOutfit.set('');
    const items=this.variantesOutfit();
    if(items.length!==2 || items.some(x=>x.variante.stock<=0)){
      this.mensajeOutfit.set('Las dos variantes sugeridas no están disponibles; selecciona otras prendas.');
      return;
    }
    if(this.costoActualOutfit()>this.presupuesto){
      this.mensajeOutfit.set('El precio actual supera tu presupuesto. Vuelve a buscar con el precio actualizado.');
      return;
    }
    if(items.some(x=>(this.carrito.items().find(i=>i.idVariante===x.variante.idVariante)?.cantidad??0)+1>x.variante.stock)){
      this.mensajeOutfit.set('La bolsa ya tiene el máximo disponible de alguna talla.');
      return;
    }
    const agregadas:number[]=[];
    for(const item of items){
      if(!this.carrito.add(item.producto,item.variante,1)){
        for(const id of agregadas)this.carrito.change(id,-1);
        this.mensajeOutfit.set('No se pudieron agregar todas las prendas.');
        return;
      }
      agregadas.push(item.variante.idVariante);
    }
    this.mensajeOutfit.set('Las dos prendas fueron agregadas a tu bolsa con sus tallas específicas.');
  }
 async ngOnInit(){await this.cargar();}
 async cargar(){
  this.cargando.set(true);this.error.set('');
  try{
   const [productos,fuentes,resultados]=await Promise.all([
    this.api.productos(),this.admin.fuentesMl(),this.admin.resultadosModulosMl()
   ]);
   this.productos.set(productos);
   this.fuentes.set(fuentes);
   this.resultados.set(resultados);
   if(!productos.some(p=>p.idProducto===this.seleccionado)&&productos.length)this.seleccionado=productos[0].idProducto;
   await this.consultarComplementos();
  }catch{this.error.set('No se pudo consultar la demostración. Revisa los permisos de administrador.');}
  finally{this.cargando.set(false);}
 }
 async consultarComplementos(){
  if(this.trabajando())return;
  this.trabajando.set('COCOMPRA');this.error.set('');this.mensaje.set('');
  try{
   const x=await this.api.complementos(this.seleccionado);
   this.complementos.set(x.recomendaciones);
   this.fuenteComplementos.set(x.fuente);
   this.cestas.set(x.cestas);
   this.mensaje.set(x.mensaje);
  }catch{this.error.set('No se pudo calcular la recomendación complementaria.');}
  finally{this.trabajando.set('');}
 }
 async ejecutar(modulo:'CLUSTERING'|'DEMANDA'|'OUTFITS'){
  if(this.trabajando())return;
  const f=this.fuente(modulo);
  if(!f?.datasetImplementado || !f.registrosDisponibles){
   this.error.set('No hay datos disponibles para este módulo. Selecciona Prueba en administración.');
   return;
  }
  this.trabajando.set(modulo);this.error.set('');this.mensaje.set('');
  try{
   const r=await this.admin.ejecutarModuloMl(modulo,modulo==='OUTFITS'?this.presupuesto:undefined);
   this.resultados.update(xs=>[r,...xs.filter(x=>x.modulo!==modulo)]);
  }catch{this.error.set('Falló la ejecución del módulo '+modulo+'. Revisa el dataset y el backend.');}
  finally{this.trabajando.set('');}
 }
}
