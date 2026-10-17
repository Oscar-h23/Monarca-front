import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  probar(id:number):Promise<Blob>{
    return firstValueFrom(this.http.post('/api/probador/'+id,
      {consentimiento:true},{headers:this.api.headers(),responseType:'blob'}));
  }
}
