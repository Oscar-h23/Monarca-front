import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Producto } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

const categories = ['Tops', 'Bottoms', 'Calzado', 'Accesorios'];

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<section class="max-w-7xl mx-auto px-5 py-12"><div class="flex justify-between items-end mb-8"><div><p class="uppercase tracking-widest text-xs text-zinc-500">Colección Monarca</p><h1 class="heading text-4xl mt-2">{{category()}}</h1></div><span class="text-sm text-zinc-500">{{filtered().length}} productos</span></div>
<div class="grid md:grid-cols-[240px_1fr] gap-10"><aside class="space-y-5"><label class="block text-sm font-semibold">Buscar<input class="field mt-2" [(ngModel)]="search" (ngModelChange)="apply()" placeholder="Nombre de producto"></label><label class="block text-sm font-semibold">Precio máximo<input class="field mt-2" type="number" min="0" [(ngModel)]="maxPrice" (ngModelChange)="apply()" placeholder="Sin límite"></label><label class="block text-sm font-semibold">Talla<select class="field mt-2" [(ngModel)]="size" (ngModelChange)="apply()"><option value="">Todas</option><option *ngFor="let s of sizes">{{s}}</option></select></label><label class="block text-sm font-semibold">Color<select class="field mt-2" [(ngModel)]="color" (ngModelChange)="apply()"><option value="">Todos</option><option *ngFor="let c of colors" [value]="c">{{c}}</option></select></label><label class="block text-sm font-semibold">Tipo de producto<select class="field mt-2" [(ngModel)]="kind" (ngModelChange)="apply()"><option value="">Todos</option><option *ngFor="let k of kinds" [value]="k">{{k}}</option></select></label><label class="block text-sm font-semibold">Ordenar<select class="field mt-2" [(ngModel)]="sort" (ngModelChange)="apply()"><option value="relevancia">Relevancia</option><option value="asc">Menor precio</option><option value="desc">Mayor precio</option></select></label><button class="underline text-sm" (click)="reset()">Limpiar filtros</button></aside>
<div><p *ngIf="error()" class="text-red-700 mb-4">{{error()}}</p><div class="grid grid-cols-2 lg:grid-cols-3 gap-6"><a *ngFor="let p of filtered()" [routerLink]="['/producto',p.idProducto]" class="block"><img [src]="p.imagen||fallback" [alt]="p.nombre" class="aspect-[3/4] w-full object-cover bg-zinc-100"><p class="text-xs mt-3 uppercase tracking-wider text-zinc-500">{{p.categoria}}</p><h2 class="font-semibold mt-1">{{p.nombre}}</h2><p class="mt-1">S/ {{p.precioBase | number:'1.2-2'}}</p></a></div><p *ngIf="!error()&&!filtered().length" class="py-12">No se encontraron productos.</p></div></div></section>
`})
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
