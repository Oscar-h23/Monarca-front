import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';
import { SessionService } from '../../core/services/session.service';
import { AdminApi, Pedido, ProductForm } from './data-access/admin-api.service';

function blankForm(): ProductForm {
  return {idVariante:null,nombre:'',categoria:'Tops',descripcion:'',marca:'Monarca',talla:'ÚNICA',
    color:'N/A',colorHex:'',precio:0,precioBase:0,stock:0,stockMinimo:0,img:''};
}
@Component({
  standalone:true, selector:'app-admin',
  imports:[CommonModule,FormsModule,RouterLink],
  templateUrl:'./admin.html'
})
export class AdminPage implements OnInit {
  private adminApi=inject(AdminApi);
  api=inject(Api);
  router=inject(Router);
  session=inject(SessionService);
  products=signal<Producto[]>([]);
  orders=signal<Pedido[]>([]);
  search=signal('');
  tab=signal<'productos'|'pedidos'>('productos');
  pending=signal(false);
  saving=signal(false);
  message=signal('');
  error=signal('');
  editor=signal(false);
  editingId=signal<number|null>(null);
  form:ProductForm=blankForm();
  fallback=asset('mariposa.png');
  categories=['Tops','Bottoms','Calzado','Accesorios'];
  filtered=computed(()=>this.products().filter(p=>p.nombre.toLowerCase().includes(this.search().toLowerCase())));
  stock=computed(()=>this.products().reduce((s,p)=>s+(p.variantes||[]).reduce((n,v)=>n+v.stock,0),0));
  totalPedidos=computed(()=>this.orders().reduce((s,p)=>s+Number(p.total||0),0));
  async ngOnInit() {
    if(!this.session.isAdmin()) {
      await this.router.navigateByUrl('/login');return;
    }
    await this.reload();
  }
  async reload(){
    this.pending.set(true);this.error.set('');
    try{
      const [products,orders]=await Promise.allSettled([
        this.api.productos(),
        this.adminApi.listOrders()
      ]);
      if(products.status==='fulfilled')this.products.set(products.value);
      else this.error.set('No se pudo cargar el inventario.');
      if(orders.status==='fulfilled')this.orders.set(orders.value);
      else this.error.set(this.error()+' No se pudieron cargar los pedidos.');
    }finally{this.pending.set(false);}
  }
  openNew(){this.editingId.set(null);this.form=blankForm();this.editor.set(true);this.error.set('');}
  openEdit(p:Producto){
    this.editingId.set(p.idProducto);
    const v=p.variantes?.[0];
    this.form={idVariante:v?.idVariante||null,nombre:p.nombre,categoria:p.categoria,
      descripcion:p.descripcion||'',marca:p.marca||'Monarca',talla:v?.talla||'ÚNICA',
      color:v?.color||'N/A',colorHex:v?.colorHex||'',precio:Number(v?.precio??p.precioBase),
      precioBase:Number(p.precioBase),stock:v?.stock??0,stockMinimo:0,img:p.imagen||''};
    this.editor.set(true);this.error.set('');
  }
  editVariant(){
    const p=this.products().find(x=>x.idProducto===this.editingId());
    const v=p?.variantes?.find(x=>x.idVariante===Number(this.form.idVariante));
    if(!v)return;
    this.form={...this.form,talla:v.talla,color:v.color,colorHex:v.colorHex||'',precio:Number(v.precio),stock:v.stock};
  }
  editVariants():Variante[]{return this.products().find(x=>x.idProducto===this.editingId())?.variantes||[];}
  private err(e:unknown){
    if(e instanceof HttpErrorResponse){
      if(e.status===401||e.status===403)return 'Sesión expirada o sin permisos de administrador.';
      if(typeof e.error==='string')return e.error;
      return e.error?.error||e.error?.mensaje||('Error del servidor ('+e.status+').');
    }
    return e instanceof Error?e.message:'No se pudo completar la operación.';
  }
  async save(){
    if(this.saving())return;
    const data=this.form;
    if(!data.nombre.trim()||!data.talla.trim()||!data.color.trim()||!data.categoria) {
      this.error.set('Completa los campos obligatorios.');return;
    }
    if(![data.precio,data.precioBase,data.stock,data.stockMinimo].every(Number.isFinite)
       ||data.precio<0||data.precioBase<0||data.stock<0||!Number.isInteger(data.stock)){
      this.error.set('Revisa los precios y el stock.');return;
    }
    if(data.img.trim()&&!/^https:\/\//i.test(data.img.trim())){
      this.error.set('La imagen debe ser una URL HTTPS.');return;
    }
    this.saving.set(true);this.error.set('');this.message.set('');
    try {
      const payload={...data,img:data.img.trim(),idVariante:this.editingId()?data.idVariante:null};
      const id=this.editingId();
      if(id){
        await this.adminApi.updateProduct(id,payload);
      } else {
        await this.adminApi.createProduct(payload);
      }
      this.editor.set(false);this.message.set(id?'Producto actualizado.':'Producto registrado.');
      await this.reload();
    } catch(e){this.error.set(this.err(e));}
    finally{this.saving.set(false);}
  }
  async remove(p:Producto){
    if(!confirm('¿Eliminar definitivamente '+p.nombre+'?'))return;
    this.error.set('');this.message.set('');
    try{
      await this.adminApi.deleteProduct(p.idProducto);
      this.message.set('Producto eliminado.');await this.reload();
    }catch(e){this.error.set(this.err(e));}
  }
  logout(){
    this.session.clear();
    this.router.navigateByUrl('/');
  }
  totalStock(p:Producto){return (p.variantes||[]).reduce((s,v)=>s+v.stock,0);}
}
