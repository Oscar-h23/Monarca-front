import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Cart } from '../../core/services/cart.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./product.html'})
export class ProductComponent implements OnInit{api=inject(Api);cart=inject(Cart);route=inject(ActivatedRoute);product=signal<Producto|null>(null);selected=signal<Variante|null>(null);message=signal('');error=signal('');fallback=asset('mariposa.png');available(p:Producto){return(p.variantes||[]).filter(v=>v.stock>0)}async ngOnInit(){const id=Number(this.route.snapshot.paramMap.get('id'));if(!Number.isSafeInteger(id)||id<=0){this.error.set('Producto inválido');return}try{this.product.set(await this.api.producto(id))}catch{this.error.set('No se pudo obtener el producto.')}}add(p:Producto){const v=this.selected();if(!v)return;this.message.set(this.cart.add(p,v)?'Producto agregado a la bolsa.':'No hay stock suficiente.')}}
