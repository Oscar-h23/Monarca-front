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
  selectedImage:File|null=null;
  imagePreview=signal('');
  imageName=signal('');
  uploadStep=signal(false);
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
  private clearImageSelection(){
    if(this.imagePreview())URL.revokeObjectURL(this.imagePreview());
    this.imagePreview.set('');
    this.imageName.set('');
    this.selectedImage=null;
  }

  closeEditor(){
    if(this.saving()||this.uploadStep())return;
    this.clearImageSelection();
    this.editor.set(false);
  }

  /** PNG/JPG sin conversión; WebP convertido localmente a JPG por el navegador. */
  async selectProductImage(event: Event){
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];
    input.value='';
    if(!file)return;
    this.error.set('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      this.error.set('Selecciona una imagen JPG, PNG o WebP.');return;
    }
    if(file.size>5_000_000){
      this.error.set('La imagen debe pesar máximo 5 MB.');return;
    }
    this.uploadStep.set(true);
    try{
      let compatible=file;
      if(file.type==='image/webp')compatible=await this.convertWebpToJpg(file);
      if(compatible.size>5_000_000)throw new Error('La imagen convertida supera 5 MB. Usa una de menor resolución.');
      const url=URL.createObjectURL(compatible);
      this.clearImageSelection();
      this.selectedImage=compatible;
      this.imagePreview.set(url);
      this.imageName.set(compatible.name);
    }catch(e){this.error.set(e instanceof Error?e.message:'No se pudo procesar la imagen seleccionada.');}
    finally{this.uploadStep.set(false);}
  }

  private async convertWebpToJpg(file:File):Promise<File>{
    // El navegador admite WebP y evita depender de un lector WebP de Java.
    const bitmap=await createImageBitmap(file);
    try{
      const maxSide=2048;
      const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
      const width=Math.max(1,Math.round(bitmap.width*scale));
      const height=Math.max(1,Math.round(bitmap.height*scale));
      if(bitmap.width*bitmap.height>20_000_000)throw new Error('La imagen supera 20 megapíxeles.');
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('No fue posible convertir la imagen WebP.');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(bitmap,0,0,width,height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
        output=>output?resolve(output):reject(new Error('No se pudo crear la imagen JPG.')),
        'image/jpeg',0.9
      ));
      return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
    }finally{bitmap.close();}
  }

  clearImageSelectionFromUi(){this.clearImageSelection();}

  chooseUrl(){
    // Si el administrador cambia la URL manualmente, deja de usarse el archivo local.
    this.clearImageSelection();
  }

  openNew(){
    this.clearImageSelection();
    this.editingId.set(null);
    this.form=blankForm();
    this.newVariants=[blankVariant()];
    this.editor.set(true);
    this.error.set('');
  }
  addVariant(){
    const total=this.newVariants.length+(this.editingId()?this.editVariants().length:0);
    if(total>=this.maxVariants)return;
    const previous=this.newVariants.at(-1);
    this.newVariants.push(blankVariant(
      previous?.precio ?? (this.editingId()?this.form.precio:this.form.precioBase),
      previous?.color ?? (this.editingId()?this.form.color:''),
      previous?.colorHex ?? (this.editingId()?this.form.colorHex:''),
      previous?.stockMinimo ?? (this.editingId()?this.form.stockMinimo:0)
    ));
  }
  removeVariant(index:number){
    if(this.editingId() || this.newVariants.length>1)this.newVariants.splice(index,1);
  }
  useBasePrice(){
    if(Number.isFinite(this.form.precioBase)&&this.form.precioBase>=0){
      this.newVariants.forEach(v=>v.precio=this.form.precioBase);
    }
  }
  newStockTotal():number {
    return this.newVariants.reduce((sum,v)=>sum+(Number.isFinite(v.stock)?v.stock:0),0);
  }
  existingStockTotal():number {
    const selected=this.form.idVariante;
    return this.editVariants().reduce((sum,v)=>{
      const current=v.idVariante===selected?this.form.stock:v.stock;
      return sum+(Number.isFinite(current)?current:0);
    },0);
  }
  openEdit(p:Producto){
    this.clearImageSelection();
    this.editingId.set(p.idProducto);
    this.newVariants=[];
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
    if(editing && (!data.talla.trim()||!data.color.trim()
      ||!Number.isFinite(data.precio)||data.precio<0
      ||!Number.isInteger(data.stock)||data.stock<0
      ||!Number.isInteger(data.stockMinimo)||data.stockMinimo<0)){
      this.error.set('Revisa la talla, el color, el precio y el stock de la variante seleccionada.');return;
    }

    const existing=editing?this.editVariants():[];
    if((!editing&&!this.newVariants.length)
      ||this.newVariants.length+existing.length>this.maxVariants){
      this.error.set('El producto debe tener entre 1 y 40 variantes.');return;
    }

    const variantes:ProductVariantForm[]=this.newVariants.map(v=>({
      talla:v.talla.trim(),color:v.color.trim(),colorHex:v.colorHex.trim(),
      precio:v.precio,stock:v.stock,stockMinimo:v.stockMinimo
    }));
    const combinaciones=new Set<string>();
    if(editing){
      for(const variante of existing){
        const selected=variante.idVariante===data.idVariante;
        const talla=selected?data.talla.trim():variante.talla;
        const color=selected?data.color.trim():variante.color;
        combinaciones.add(talla.toLocaleLowerCase()+'|'+color.toLocaleLowerCase());
      }
    }
    for(const [i,v] of variantes.entries()){
      if(!v.talla||!v.color||v.talla.length>20||v.color.length>50){
        this.error.set('Completa la talla y el color de la nueva variante '+(i+1)+'.');return;
      }
      if(!Number.isFinite(v.precio)||v.precio<0
          ||!Number.isInteger(v.stock)||v.stock<0
          ||!Number.isInteger(v.stockMinimo)||v.stockMinimo<0){
        this.error.set('Revisa el precio y el stock de la nueva variante '+(i+1)+'.');return;
      }
      if(v.colorHex&&!/^#[0-9a-fA-F]{6}$/.test(v.colorHex)){
        this.error.set('El color hexadecimal de la nueva variante '+(i+1)+' debe tener formato #FFFFFF.');return;
      }
      const key=v.talla.toLocaleLowerCase()+'|'+v.color.toLocaleLowerCase();
      if(combinaciones.has(key)){
        this.error.set('La combinación de talla y color '+v.talla+' / '+v.color+' ya existe.');return;
      }
      combinaciones.add(key);
    }

    this.saving.set(true);this.error.set('');this.message.set('');
    try{
      // Subir solo al guardar: evita generar archivos huérfanos al cancelar el formulario.
      if(this.selectedImage){
        this.uploadStep.set(true);
        const uploaded=await this.adminApi.uploadProductImage(this.selectedImage);
        data.img=uploaded.url;
        this.clearImageSelection();
        this.uploadStep.set(false);
      }
      const payload={...data,img:data.img.trim(),idVariante:editing?data.idVariante:null,variantes};
      const id=this.editingId();
      if(id){
        await this.adminApi.updateProduct(id,payload);
      }else{
        await this.adminApi.createProduct(payload);
      }
      this.clearImageSelection();
      this.editor.set(false);
      this.message.set(id
        ? 'Producto actualizado'+(variantes.length?' y '+variantes.length+' nueva(s) talla(s) agregada(s).':'.')
        : 'Producto registrado con '+variantes.length+' variante(s).');
      await this.reload();
    }catch(e){this.error.set(this.err(e));}
    finally{this.saving.set(false);this.uploadStep.set(false);}
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
