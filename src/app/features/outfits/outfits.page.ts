import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Cart } from '../../core/services/cart.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

interface Candidato {
  idVariantes:number[];
  algoritmo:string;
}
interface PrendaLook {
  producto:Producto;
  variante:Variante;
}
interface Look {
  clave:string;
  algoritmos:string;
  prendas:PrendaLook[];
  total:number;
}

@Component({
  standalone:true,
  selector:'app-outfits',
  imports:[CommonModule,FormsModule,RouterLink],
  templateUrl:'./outfits.html'
})
export class OutfitsPage implements OnInit {
  private readonly api=inject(Api);
  private readonly cart=inject(Cart);
  readonly fallback=asset('mariposa.png');
  readonly imagenTops=asset('portada_tops/Portada_Tops.png');
  readonly imagenBottoms=asset('portada_bottoms/portada_bottom_1.png');
  presupuesto=180;
  presupuestoConsultado=signal(0);
  procesando=signal(false);
  agregando=signal(false);
  error=signal('');
  mensaje=signal('');
  productos=signal<Producto[]>([]);
  candidatos=signal<Candidato[]>([]);
  factibles=signal(0);

  looks=computed<Look[]>(()=>{
    const all=this.productos();
    const byKey=new Map<string,Look>();
    for(const c of this.candidatos()){
      const prendas=c.idVariantes.map(id=>{
        for(const producto of all) {
          const variante=(producto.variantes||[]).find(v=>v.idVariante===id&&v.stock>0);
          if(variante)return {producto,variante};
        }
        return null;
      });
      if(prendas.length!==2 || prendas.some(p=>p===null))continue;
      const valid=prendas as PrendaLook[];
      const total=valid.reduce((sum,p)=>sum+Number(p.variante.precio),0);
      if(total>this.presupuestoConsultado())continue;
      const key=c.idVariantes.join('-');
      const previous=byKey.get(key);
      if(previous){previous.algoritmos+=' · '+c.algoritmo;continue;}
      byKey.set(key,{clave:key,algoritmos:c.algoritmo,prendas:valid,total});
    }
    return [...byKey.values()];
  });

  async ngOnInit(){await this.buscar();}
  async buscar(){
    const presupuesto=Number(this.presupuesto);
    if(!Number.isFinite(presupuesto)||presupuesto<20||presupuesto>2000){
      this.error.set('Ingresa un presupuesto entre S/ 20 y S/ 2000.');return;
    }
    if(this.procesando())return;
    this.procesando.set(true);
    this.mensaje.set('');this.error.set('');this.candidatos.set([]);
    try{
      const [productos,recomendado]=await Promise.all([
        this.api.productos(),this.api.outfitsPresupuesto(presupuesto)
      ]);
      this.productos.set(productos);
      this.presupuestoConsultado.set(presupuesto);
      this.factibles.set(recomendado.factibles||0);
      const candidatos:Candidato[]=[];
      if(recomendado.aEstrella?.combinacion?.id_variantes?.length===2)
        candidatos.push({algoritmo:'A*',idVariantes:recomendado.aEstrella.combinacion.id_variantes});
      if(recomendado.hillClimbing?.combinacion?.id_variantes?.length===2)
        candidatos.push({algoritmo:'Hill Climbing',idVariantes:recomendado.hillClimbing.combinacion.id_variantes});
      this.candidatos.set(candidatos);
      if(!this.looks().length)this.mensaje.set('No encontramos dos prendas disponibles dentro de ese presupuesto. Prueba con otro monto.');
    } catch {
      this.error.set('No pudimos generar tu look en este momento. Intenta nuevamente.');
    } finally {this.procesando.set(false);}
  }
  async agregar(look:Look){
    if(this.agregando())return;
    this.agregando.set(true);this.error.set('');this.mensaje.set('');
    try{
      // Refrescar existencias del catálogo antes de agregar las dos variantes.
      const productos=await this.api.productos();
      this.productos.set(productos);
      const fresh=this.looks().find(l=>l.clave===look.clave);
      if(!fresh||fresh.prendas.length!==2){
        this.error.set('Una de las prendas ya no está disponible. Busca otra combinación.');
        return;
      }
      if(this.presupuesto!==this.presupuestoConsultado()){
        this.error.set('El presupuesto cambió. Busca nuevamente antes de añadir.');
        return;
      }
      for(const {variante} of fresh.prendas){
        const enBolsa=this.cart.items().find(x=>x.idVariante===variante.idVariante)?.cantidad||0;
        if(enBolsa+1>variante.stock){
          this.error.set('No hay unidades suficientes de esa variante en tu bolsa.');
          return;
        }
      }
      const insertadas:number[]=[];
      for(const {producto,variante} of fresh.prendas){
        if(!this.cart.add(producto,variante,1)){
          for(const id of insertadas)this.cart.change(id,-1);
          this.error.set('No se pudieron añadir ambas prendas. Revisa el stock.');
          return;
        }
        insertadas.push(variante.idVariante);
      }
      this.mensaje.set('¡Look agregado! Puedes revisar ambas prendas en tu bolsa.');
    } catch {
      this.error.set('No se pudo comprobar el catálogo. Intenta nuevamente.');
    } finally {this.agregando.set(false);}
  }
}
