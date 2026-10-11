import { Injectable, signal, computed } from '@angular/core';
import { Item, Producto, Variante } from '../models/shop.models';
import { Api } from './api.service';

@Injectable({providedIn:'root'})
export class Cart {
 private load():Item[]{try{const v=JSON.parse(localStorage.getItem('monarca_carrito')||'[]');return Array.isArray(v)?v.filter((x:Item)=>Number.isSafeInteger(x.idVariante)&&x.cantidad>0&&x.stockDisponible>=x.cantidad&&Number.isFinite(x.precio)):[]}catch{return []}}
 items=signal<Item[]>(this.load());
 count=computed(()=>this.items().reduce((s,x)=>s+x.cantidad,0));
 total=computed(()=>this.items().reduce((s,x)=>s+x.precio*x.cantidad,0));
 private save(v:Item[]){this.items.set(v);localStorage.setItem('monarca_carrito',JSON.stringify(v))}
 add(p:Producto,v:Variante){const old=this.items().find(x=>x.idVariante===v.idVariante);if((old?.cantidad||0)>=v.stock)return false;
 const item:Item={idProducto:p.idProducto,idVariante:v.idVariante,nombre:p.nombre,sku:v.sku,talla:v.talla,color:v.color,precio:v.precio,cantidad:(old?.cantidad||0)+1,imagen:p.imagen||'',stockDisponible:v.stock};
 this.save([...this.items().filter(x=>x.idVariante!==v.idVariante),item]);return true}
 change(id:number,delta:number){const curr=this.items().find(x=>x.idVariante===id);if(!curr)return;const next=curr.cantidad+delta;if(next<=0){this.remove(id);return}if(next>curr.stockDisponible)return;this.save(this.items().map(x=>x.idVariante===id?{...x,cantidad:next}:x))}
 remove(id:number){this.save(this.items().filter(x=>x.idVariante!==id))}
 clear(){this.save([])}
 async refresh(api:Api){const products=await api.productos();const result:Item[]=[];let changed=false;
 for(const item of this.items()){const p=products.find(x=>x.idProducto===item.idProducto);const v=p?.variantes?.find(x=>x.idVariante===item.idVariante&&x.stock>0);if(!p||!v){changed=true;continue}const next={...item,nombre:p.nombre,precio:v.precio,stockDisponible:v.stock,cantidad:Math.min(item.cantidad,v.stock),imagen:p.imagen||''};if(next.precio!==item.precio||next.cantidad!==item.cantidad)changed=true;result.push(next)}
 this.save(result);return changed}
}
