import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Perfil, PerfilApi, PerfilEditable } from '../../core/services/perfil-api.service';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./profile.html'})
export class ProfilePage implements OnInit,OnDestroy {
  private api=inject(PerfilApi);
  loading=signal(true);busy=signal(false);error=signal('');message=signal('');
  fotoUrl=signal('');hasPhoto=signal(false);
  email='';
  form:PerfilEditable={nombres:'',apellidos:'',telefono:'',tipoDocumento:'DNI',
    numeroDocumento:'',direccion:'',distrito:'',provincia:'',departamento:'',referencia:''};

  async ngOnInit(){
    try{const p=await this.api.obtener();this.email=p.correo;this.hasPhoto.set(p.tieneFoto);
      this.form={nombres:p.nombres,apellidos:p.apellidos,telefono:p.telefono||'',
        tipoDocumento:p.tipoDocumento||'DNI',numeroDocumento:p.numeroDocumento||'',
        direccion:p.direccion||'',distrito:p.distrito||'',provincia:p.provincia||'',
        departamento:p.departamento||'',referencia:p.referencia||''};
      if(p.tieneFoto)await this.mostrarFoto();
    }catch(e){this.error.set(this.mensajeError(e));}
    finally{this.loading.set(false);}
  }
  ngOnDestroy(){this.limpiarFoto();}
  private limpiarFoto(){if(this.fotoUrl())URL.revokeObjectURL(this.fotoUrl());this.fotoUrl.set('');}
  private async mostrarFoto(){const blob=await this.api.foto();this.limpiarFoto();this.fotoUrl.set(URL.createObjectURL(blob));}
  private mensajeError(e:unknown){return e instanceof HttpErrorResponse
    ?(typeof e.error?.error==='string'?e.error.error:'No fue posible completar la operación.')
    :(e instanceof Error?e.message:'No se pudo conectar con el servidor.');}
  async guardar(){
    if(this.busy())return;this.busy.set(true);this.error.set('');this.message.set('');
    try{await this.api.guardar(this.form);this.message.set('Perfil actualizado correctamente.');}
    catch(e){this.error.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
  async subir(event:Event){
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];if(!file)return;
    input.value='';
    if(file.size>4_000_000||!['image/jpeg','image/png','image/webp'].includes(file.type)){
      this.error.set('Utiliza una fotografía JPG, PNG o WebP de máximo 4 MB.');return;
    }
    this.busy.set(true);this.error.set('');this.message.set('');
    try{await this.api.subirFoto(file);await this.mostrarFoto();this.hasPhoto.set(true);
      this.message.set('Foto guardada de forma privada para el probador.');}
    catch(e){this.error.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
  async borrar(){
    if(this.busy()||!this.hasPhoto())return;
    this.busy.set(true);this.error.set('');this.message.set('');
    try{await this.api.borrarFoto();this.limpiarFoto();this.hasPhoto.set(false);
      this.message.set('Foto eliminada del perfil.');}
    catch(e){this.error.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
}
