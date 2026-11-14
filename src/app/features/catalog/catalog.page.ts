import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Api } from '../../core/services/api.service';
import { Producto } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

const categories = ['Tops', 'Bottoms', 'Vestidos', 'Calzado', 'Accesorios'];

const normalize = (value:string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./catalog.html'})
export class CatalogComponent implements OnInit,OnDestroy {
  route=inject(ActivatedRoute);
  api=inject(Api);
  category=signal('');
  all:Producto[]=[];
  filtered=signal<Producto[]>([]);
  error=signal('');
  filtersOpen=signal(false);
  search='';
  maxPrice:number|null=null;
  size='';
  color='';
  sort='relevancia';
  sizes:string[]=[];
  colors:string[]=[];
  fallback=asset('mariposa.png');
  private routeSubscription?:Subscription;
  private requestId=0;

  ngOnInit(){
    this.routeSubscription=this.route.paramMap.subscribe(params=>{
      const key=(params.get('categoria')||'').toLowerCase();
      const nextCategory=categories.find(c=>c.toLowerCase()===key)||key;
      if(this.category()!==nextCategory){
        this.resetValues();
        this.all=[];
        this.filtered.set([]);
        this.sizes=[];
        this.colors=[];
        this.filtersOpen.set(false);
      }
      this.category.set(nextCategory);
      this.error.set('');
      const currentRequest=++this.requestId;
      void this.api.productos().then(products=>{
        if(currentRequest!==this.requestId)return;
        this.all=products.filter(p=>normalize(p.categoria||'')===normalize(nextCategory));
        this.refreshOptions();
        this.apply();
      }).catch(()=>{
        if(currentRequest!==this.requestId)return;
        this.error.set('No se pudo obtener los productos del servidor.');
      });
    });
  }

  ngOnDestroy(){
    this.requestId++;
    this.routeSubscription?.unsubscribe();
  }

  private refreshOptions(){
    const availableProducts=this.all.filter(p=>(p.variantes||[]).some(v=>v.stock>0));
    const variants=availableProducts.flatMap(p=>(p.variantes||[]).filter(v=>v.stock>0));
    this.sizes=[...new Set(variants.map(v=>v.talla?.trim()).filter((v):v is string=>!!v))].sort((a,b)=>{
      const order=['XXS','XS','S','M','L','XL','XXL','XXXL','Única'];
      const ai=order.findIndex(x=>normalize(x)===normalize(a));
      const bi=order.findIndex(x=>normalize(x)===normalize(b));
      return (ai<0?order.length:ai)-(bi<0?order.length:bi)||a.localeCompare(b,'es');
    });
    this.colors=[...new Set(variants.map(v=>v.color?.trim()).filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b,'es'));
    if(this.size&&!this.sizes.includes(this.size))this.size='';
    if(this.color&&!this.colors.includes(this.color))this.color='';
  }

  apply(){
    const text=normalize(this.search.trim());
    const matches=this.all.filter(p=>{
      const variants=(p.variantes||[]).filter(v=>v.stock>0);
      return normalize(p.nombre).includes(text)
        &&(this.maxPrice==null||Number(p.precioBase)<=this.maxPrice)
        &&(!this.size||variants.some(v=>normalize(v.talla)===normalize(this.size)))
        &&(!this.color||variants.some(v=>normalize(v.color)===normalize(this.color)))
        &&(!this.size||!this.color||variants.some(v=>normalize(v.talla)===normalize(this.size)&&normalize(v.color)===normalize(this.color)));
    });
    if(this.sort==='asc')matches.sort((a,b)=>Number(a.precioBase)-Number(b.precioBase));
    else if(this.sort==='desc')matches.sort((a,b)=>Number(b.precioBase)-Number(a.precioBase));
    this.filtered.set(matches);
  }

  private resetValues(){
    this.search='';
    this.maxPrice=null;
    this.size='';
    this.color='';
    this.sort='relevancia';
  }
  reset(){this.resetValues();this.apply();}
}
