import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api } from './api.service';

export interface Perfil {
  nombres:string;apellidos:string;correo:string;telefono:string|null;
  tipoDocumento:string|null;numeroDocumento:string|null;direccion:string|null;
  distrito:string|null;provincia:string|null;departamento:string|null;
  referencia:string|null;tieneFoto:boolean;
}
export type PerfilEditable=Omit<Perfil,'correo'|'tieneFoto'>;
@Injectable({providedIn:'root'})
export class PerfilApi {
  private http=inject(HttpClient);
  private api=inject(Api);
  obtener():Promise<Perfil>{
    return firstValueFrom(this.http.get<Perfil>('/api/perfil',{headers:this.api.headers()}));
  }
  guardar(data:PerfilEditable):Promise<Perfil>{
    return firstValueFrom(this.http.put<Perfil>('/api/perfil',data,{headers:this.api.headers()}));
  }
  foto():Promise<Blob>{
    return firstValueFrom(this.http.get('/api/perfil/foto',{headers:this.api.headers(),responseType:'blob'}));
  }
  subirFoto(file:File):Promise<void>{
    const body=new FormData();body.append('foto',file);
    return firstValueFrom(this.http.post<void>('/api/perfil/foto',body,{headers:this.api.headers()}));
  }
  borrarFoto():Promise<void>{
    return firstValueFrom(this.http.delete<void>('/api/perfil/foto',{headers:this.api.headers()}));
  }
  proveedorProbador():Promise<{proveedor:string}>{
    return firstValueFrom(this.http.get<{proveedor:string}>('/api/probador/configuracion',
      {headers:this.api.headers()}));
  }
  async probar(id:number):Promise<Blob>{
    try {
      return await firstValueFrom(this.http.post('/api/probador/'+id,
        {consentimiento:true},{headers:this.api.headers(),responseType:'blob'}));
    } catch(error) {
      // Angular recibe incluso los errores JSON como Blob cuando se espera una imagen.
      if(error instanceof HttpErrorResponse && error.error instanceof Blob) {
        let detail='';
        try {
          const json=JSON.parse(await error.error.text()) as {error?:string;detail?:string;message?:string};
          detail=json.detail||json.error||json.message||'';
        } catch {
          // Si el proveedor responde HTML, no mostrarlo ni exponer información interna.
        }
        if(detail && detail!=='Bad Gateway' && detail!=='Internal Server Error') {
          throw new Error('HTTP '+error.status+': '+detail);
        }
      }
      throw error;
    }
  }
}
