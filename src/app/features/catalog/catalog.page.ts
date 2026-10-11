import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Producto } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

const categories = ['Tops', 'Bottoms', 'Calzado', 'Accesorios'];

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./catalog.html'})
export class CatalogComponent implements OnInit{route=inject(ActivatedRoute);api=inject(Api);category=signal('');all:Producto[]=[];filtered=signal<Producto[]>([]);error=signal('');search='';maxPrice:number|null=null;size='';color='';kind='';sort='relevancia';sizes=['XS','S','M','L','XL','Única'];colors=['Negro','Blanco','Rojo','Azul','Verde','Beige','Rosa'];kinds=['Blusa','Polo','Crop Top','Falda','Jean','Sandalia','Zapato','Bolso','Accesorio'];fallback=asset('mariposa.png');ngOnInit(){this.route.paramMap.subscribe(async params=>{const key=(params.get('categoria')||'').toLowerCase();this.category.set(categories.find(c=>c.toLowerCase()===key)||key);try{this.all=(await this.api.productos()).filter(p=>p.categoria?.toLowerCase()===key);this.apply()}catch{this.error.set('No se pudo obtener los productos del servidor.')}})}apply(){
 const normalize=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const text=normalize(this.search.trim());
 const matches=this.all.filter(p=>{
  const variants=(p.variantes||[]).filter(v=>v.stock>0);
  return normalize(p.nombre).includes(text)
    &&(!this.maxPrice||Number(p.precioBase)<=this.maxPrice)
    &&(!this.kind||normalize(p.nombre).includes(normalize(this.kind)))
    &&(!this.size||variants.some(v=>normalize(v.talla)===normalize(this.size)))
    &&(!this.color||variants.some(v=>normalize(v.color).includes(normalize(this.color))))
    &&(!this.size||!this.color||variants.some(v=>normalize(v.talla)===normalize(this.size)&&normalize(v.color).includes(normalize(this.color))));
 });
 if(this.sort==='asc')matches.sort((a,b)=>Number(a.precioBase)-Number(b.precioBase));
 else if(this.sort==='desc')matches.sort((a,b)=>Number(b.precioBase)-Number(a.precioBase));
 this.filtered.set(matches);
 }
reset(){this.search='';this.maxPrice=null;this.size='';this.color='';this.kind='';this.sort='relevancia';this.apply()}}
