import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Producto, Variante } from '../../core/models/shop.models';
import { asset } from '../../core/utils/assets';
import { SessionService } from '../../core/services/session.service';
import { AdminApi, Pedido, ProductForm, ProductVariantForm } from './data-access/admin-api.service';

function blankForm(): ProductForm {
  return {idVariante:null,nombre:'',categoria:'Tops',descripcion:'',marca:'Monarca',talla:'ÚNICA',
    color:'N/A',colorHex:'',precio:0,precioBase:0,stock:0,stockMinimo:0,img:''};
} 
function blankVariant(price = 0, color = '', colorHex = '', stockMinimo = 0): ProductVariantForm {
  return { talla: '', color, colorHex, precio: price, stock: 0, stockMinimo };
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
  newVariants:ProductVariantForm[]=[blankVariant()];
  readonly maxVariants=40;
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
  openNew(){
    this.editingId.set(null);
    this.form=blankForm();
    this.newVariants=[blankVariant()];
    this.editor.set(true);
    this.error.set('');
  }
  addVariant(){
    if(this.newVariants.length>=this.maxVariants)return;
    const previous=this.newVariants.at(-1);
    this.newVariants.push(blankVariant(
      previous?.precio || this.form.precioBase || 0,
      previous?.color || '',
      previous?.colorHex || '',
      previous?.stockMinimo || 0
    ));
  }
  removeVariant(index:number){
    if(this.newVariants.length>1)this.newVariants.splice(index,1);
  }
  useBasePrice(){
    if(Number.isFinite(this.form.precioBase)&&this.form.precioBase>=0){
      this.newVariants.forEach(v=>v.precio=this.form.precioBase);
    }
  }
  newStockTotal():number {
    return this.newVariants.reduce((sum,v)=>sum+(Number.isFinite(v.stock)?v.stock:0),0);
  }
  openEdit(p:Producto){
    this.editingId.set(p.idProducto);
    const v=p.variantes?.[0];
    this.form={idVariante:v?.idVariante||null,nombre:p.nombre,categoria:p.categoria,
      descripcion:p.descripcion||'',marca:p.marca||'Monarca',talla:v?.talla||'ÚNICA',
      color:v?.color||'N/A',colorHex:v?.colorHex||'',precio:Number(v?.precio??p.precioBase),
      precioBase:Number(p.precioBase),stock:v?.stock??0,stockMinimo:v?.stockMinimo??0,img:p.imagen||''};
    this.editor.set(true);this.error.set('');
  }
  editVariant(){
    const p=this.products().find(x=>x.idProducto===this.editingId());
    const v=p?.variantes?.find(x=>x.idVariante===Number(this.form.idVariante));
    if(!v)return;
    this.form={...this.form,talla:v.talla,color:v.color,colorHex:v.colorHex||'',precio:Number(v.precio),stock:v.stock,stockMinimo:v.stockMinimo??0};
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
    if(!data.nombre.trim()||!data.categoria){
      this.error.set('Completa el nombre y la categoría.');return;
    }
    if(!Number.isFinite(data.precioBase)||data.precioBase<0){
      this.error.set('El precio base debe ser un número igual o mayor a cero.');return;
    }
    if(data.img.trim()&&!/^https:\/\//i.test(data.img.trim())){
      this.error.set('La imagen debe ser una URL HTTPS.');return;
    }

    const editing=!!this.editingId();
    let variantes:ProductVariantForm[]=[];
    if(editing){
      if(!data.talla.trim()||!data.color.trim()||!Number.isFinite(data.precio)
          ||data.precio<0||!Number.isInteger(data.stock)||data.stock<0
          ||!Number.isInteger(data.stockMinimo)||data.stockMinimo<0){
        this.error.set('Revisa la talla, color, precio y stock de la variante.');return;
      }
    }else{
      if(!this.newVariants.length||this.newVariants.length>this.maxVariants){
        this.error.set('Registra entre 1 y 40 variantes.');return;
      }
      variantes=this.newVariants.map(v=>({
        talla:v.talla.trim(),color:v.color.trim(),colorHex:v.colorHex.trim(),
        precio:v.precio,stock:v.stock,stockMinimo:v.stockMinimo
      }));
      const unicas=new Set<string>();
      for(const [i,v] of variantes.entries()){
        if(!v.talla||!v.color||v.talla.length>20||v.color.length>50){
          this.error.set('Completa la talla y el color de la variante '+(i+1)+'.');return;
        }
        if(!Number.isFinite(v.precio)||v.precio<0
            ||!Number.isInteger(v.stock)||v.stock<0
            ||!Number.isInteger(v.stockMinimo)||v.stockMinimo<0){
          this.error.set('Revisa precio y stock de la variante '+(i+1)+'.');return;
        }
        if(v.colorHex&&!/^#[0-9a-fA-F]{6}$/.test(v.colorHex)){
          this.error.set('El color hexadecimal de la variante '+(i+1)+' debe tener formato #FFFFFF.');return;
        }
        const key=v.talla.toLocaleLowerCase()+'|'+v.color.toLocaleLowerCase();
        if(unicas.has(key)){
          this.error.set('No puedes repetir la misma combinación de talla y color.');return;
        }
        unicas.add(key);
      }
    }
    this.saving.set(true);this.error.set('');this.message.set('');
    try{
      const payload={...data,img:data.img.trim(),idVariante:editing?data.idVariante:null};
      const id=this.editingId();
      if(id){
        await this.adminApi.updateProduct(id,payload);
      }else{
        await this.adminApi.createProduct({...payload,variantes});
      }
      this.editor.set(false);
      this.message.set(id?'Producto actualizado.':'Producto registrado con '+variantes.length+' variante(s).');
      await this.reload();
    }catch(e){this.error.set(this.err(e));}
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
