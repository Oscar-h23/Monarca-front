import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Producto } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';

@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./home.html'})
export class HomeComponent implements OnInit{api=inject(Api);hero=asset('portada.png');description=asset('descripcion.jpg');enfoque=asset('enfoque.png');mision=asset('mision.jpg');vision=asset('vision.jpg');videoHorizontal=asset('video_horizontal.mp4');nuevo=asset('nuevo_ingreso.png');fallback=asset('mariposa.png');sections=[{name:'Tops',key:'tops',img:asset('portada_tops/Portada_Tops.png')},{name:'Bottoms',key:'bottoms',img:asset('portada_bottoms/portada_bottom_1.png')},{name:'Calzado',key:'calzado',img:asset('portada_calzados/portada_calzado_2.png')},{name:'Accesorios',key:'accesorios',img:asset('portada_accesorio/portada_accesorios_1.png')}];products=signal<Producto[]>([]);error=signal('');async ngOnInit(){try{const v=await this.api.productos();this.products.set((v.filter(p=>p.destacado).length?v.filter(p=>p.destacado):v).slice(0,4))}catch{this.error.set('No se pudo cargar el catálogo. Comprueba que el backend esté disponible.')}}}
