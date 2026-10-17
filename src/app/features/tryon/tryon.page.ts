import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Api } from '../../core/services/api.service';
import { PerfilApi } from '../../core/services/perfil-api.service';
import { Producto } from '../../core/models/shop.models';

@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./tryon.html'})
export class TryonPage implements OnInit,OnDestroy{
 private api=inject(Api);private perfil=inject(PerfilApi);private route=inject(ActivatedRoute);
 product=signal<Producto|null>(null);hasPhoto=signal(false);
 busy=signal(false);loading=signal(true);error=signal('');
 consent=signal(false);result=signal('');
 ngOnDestroy(){this.clearResult();}
 private clearResult(){if(this.result())URL.revokeObjectURL(this.result());this.result.set('');}
 async ngOnInit(){
  try{const id=Number(this.route.snapshot.paramMap.get('id'));
   if(!Number.isSafeInteger(id)||id<=0)throw new Error('Producto inválido.');
   const [p,user]=await Promise.all([this.api.producto(id),this.perfil.obtener()]);
   this.product.set(p);this.hasPhoto.set(user.tieneFoto);
  }catch(e){this.error.set(this.errorText(e));}
  finally{this.loading.set(false);}
 }
 private errorText(e:unknown){
   if(e instanceof HttpErrorResponse)return e.status===429
     ?'El proveedor alcanzó su límite de créditos gratuitos.'
     :e.status===503?'El probador necesita un token de API válido en el backend.'
     :e.status===400?'Revisa tu foto y la imagen de la prenda.'
     :'El probador no está disponible temporalmente.';
   return e instanceof Error?e.message:'No fue posible realizar la prueba.';
 }
 async probar(){
  const p=this.product();if(!p||this.busy()||!this.hasPhoto()||!this.consent())return;
  this.busy.set(true);this.error.set('');this.clearResult();
  try{const blob=await this.perfil.probar(p.idProducto);this.result.set(URL.createObjectURL(blob));}
  catch(e){this.error.set(this.errorText(e));}
  finally{this.busy.set(false);this.consent.set(false);}
 }
}
