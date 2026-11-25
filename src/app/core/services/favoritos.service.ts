import { Injectable, inject, signal, effect, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SessionService } from './session.service';
import { Api } from './api.service';
import { Router } from '@angular/router';

export interface AlertaFavorito {
  id:number; idProducto:number; idVariante:number; nombre:string; talla:string; color:string;
  precioAnterior:number; precioNuevo:number; creado:string; leida:boolean;
}
interface DatosFavoritos { favoritos:number[]; alertas:AlertaFavorito[]; noLeidas:number; }

@Injectable({providedIn:'root'})
export class FavoritosService {
  private http=inject(HttpClient);
  private api=inject(Api);
  private session=inject(SessionService);
  private router=inject(Router);
  private destroy=inject(DestroyRef);
  readonly ids=signal<number[]>([]);
  readonly alertas=signal<AlertaFavorito[]>([]);
  readonly noLeidas=signal(0);
  readonly cargando=signal(false);
  readonly ocupado=signal(false);
  readonly error=signal('');
  readonly mensaje=signal('');
  private cuenta='';
  private version=0;
  private secuencia=0;
  constructor(){
    effect(()=>{
      const token=this.session.token();
      if(token===this.cuenta)return;
      this.cuenta=token;
      this.version++;this.secuencia++;
      this.ids.set([]);this.alertas.set([]);this.noLeidas.set(0);
      this.error.set('');this.mensaje.set('');this.cargando.set(false);this.ocupado.set(false);
      if(token)void this.refrescar();
    });
    const timer=setInterval(()=>{if(this.session.token()&&document.visibilityState==='visible'&&!this.ocupado())void this.refrescar();},60000);
    this.destroy.onDestroy(()=>clearInterval(timer));
  }
  esFavorito(id:number){return this.ids().includes(id);}
  private vigente(version:number,token:string){return version===this.version&&token===this.session.token();}
  async refrescar(){
    const token=this.session.token();if(!token)return;
    if(this.cargando())return;
    const v=this.version,s=++this.secuencia;
    this.cargando.set(true);
    try {
      const d=await firstValueFrom(this.http.get<DatosFavoritos>(this.api.base+'/perfil/favoritos',{headers:this.api.headers()}));
      if(!this.vigente(v,token)||s!==this.secuencia)return;
      this.ids.set(d.favoritos);this.alertas.set(d.alertas);this.noLeidas.set(d.noLeidas);this.error.set('');
    }catch{if(this.vigente(v,token)&&s===this.secuencia)this.error.set('No pudimos consultar tus favoritos. Intenta actualizar.');}
    finally{if(this.vigente(v,token)&&s===this.secuencia)this.cargando.set(false);}
  }
  async alternar(id:number){
    if(!this.session.token()){void this.router.navigateByUrl('/login');return;}
    if(this.ocupado()||this.cargando())return;
    const v=this.version,token=this.session.token(),quitar=this.esFavorito(id);
    this.ocupado.set(true);this.error.set('');this.mensaje.set('');
    const url=this.api.base+'/perfil/favoritos/'+id;
    try{
      await firstValueFrom(quitar?this.http.delete<void>(url,{headers:this.api.headers()}):this.http.put<void>(url,{}, {headers:this.api.headers()}));
      if(!this.vigente(v,token))return;
      this.ids.update(xs=>quitar?xs.filter(x=>x!==id):[id,...xs]);
      this.mensaje.set(quitar?'Prenda retirada de favoritos.':'Prenda guardada. Te avisaremos si baja de precio.');
      await this.refrescar();
    }catch{if(this.vigente(v,token))this.error.set('No se pudo actualizar tu lista de favoritos.');}
    finally{if(this.vigente(v,token))this.ocupado.set(false);}
  }
  async marcarLeidas(){
    if(!this.session.token()||this.ocupado()||this.cargando())return;
    const v=this.version,token=this.session.token();this.ocupado.set(true);
    try{await firstValueFrom(this.http.put<void>(this.api.base+'/perfil/favoritos/alertas/leidas',{}, {headers:this.api.headers()}));if(this.vigente(v,token))await this.refrescar();}
    catch{if(this.vigente(v,token))this.error.set('No se pudieron marcar las alertas como leídas.');}
    finally{if(this.vigente(v,token))this.ocupado.set(false);}
  }
}
