import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Perfil, PerfilApi, PerfilEditable } from '../../core/services/perfil-api.service';
import { GoogleButtonComponent } from '../../shared/google-button.component';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink,GoogleButtonComponent],templateUrl:'./profile.html'})
export class ProfilePage implements OnInit,OnDestroy {
  private api=inject(PerfilApi);
  loading=signal(true);busy=signal(false);error=signal('');message=signal('');
  editing=signal(false);
  section=signal<'datos'|'direccion'|'medidas'|'foto'|'cuenta'>('datos');
  private savedForm:PerfilEditable|null=null;
  fotoUrl=signal('');hasPhoto=signal(false);
  email='';
  googleVinculado=signal(false);
  googleMessage=signal('');googleError=signal('');
  form:PerfilEditable={nombres:'',apellidos:'',telefono:'',tipoDocumento:'DNI',
    numeroDocumento:'',direccion:'',distrito:'',provincia:'',departamento:'',referencia:'',bustoCm:null,cinturaCm:null,caderaCm:null,alturaCm:null};

  async ngOnInit(){
    try{const p=await this.api.obtener();this.email=p.correo;this.hasPhoto.set(p.tieneFoto);this.googleVinculado.set(p.googleVinculado);
      this.form={nombres:p.nombres,apellidos:p.apellidos,telefono:p.telefono||'',
        tipoDocumento:p.tipoDocumento||'DNI',numeroDocumento:p.numeroDocumento||'',
        direccion:p.direccion||'',distrito:p.distrito||'',provincia:p.provincia||'',
        departamento:p.departamento||'',referencia:p.referencia||'',
        bustoCm:p.bustoCm,cinturaCm:p.cinturaCm,caderaCm:p.caderaCm,alturaCm:p.alturaCm};
      this.savedForm={...this.form};
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
  cambiarSeccion(value:'datos'|'direccion'|'medidas'|'foto'|'cuenta'){
    if(this.busy())return;
    this.section.set(value);
    this.error.set('');
  }
  editar(){
    if(this.busy())return;
    this.error.set('');
    this.message.set('');
    this.savedForm={...this.form};
    this.editing.set(true);
  }
  cancelar(){
    if(this.busy())return;
    if(this.savedForm)this.form={...this.savedForm};
    this.editing.set(false);
    this.error.set('');
    this.message.set('');
  }
  async guardar(){
    if(this.busy()||!this.editing())return;
    this.busy.set(true);this.error.set('');this.message.set('');
    try{
      const updated=await this.api.guardar(this.form);
      this.form={nombres:updated.nombres,apellidos:updated.apellidos,telefono:updated.telefono||'',
        tipoDocumento:updated.tipoDocumento||'DNI',numeroDocumento:updated.numeroDocumento||'',
        direccion:updated.direccion||'',distrito:updated.distrito||'',provincia:updated.provincia||'',
        departamento:updated.departamento||'',referencia:updated.referencia||'',
        bustoCm:updated.bustoCm,cinturaCm:updated.cinturaCm,caderaCm:updated.caderaCm,alturaCm:updated.alturaCm};
      this.savedForm={...this.form};
      this.editing.set(false);
      this.message.set('¡Cambios guardados exitosamente!');
    }
    catch(e){this.error.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
  async vincularGoogle(credential:string){
    if(this.busy()||!this.editing())return;
    this.busy.set(true);this.googleError.set('');this.googleMessage.set('');
    try{
      await this.api.vincularGoogle(credential);
      this.googleVinculado.set(true);
      this.googleMessage.set('Google vinculado correctamente. Ya puedes iniciar sesión con Google sin crear otra cuenta.');
    }catch(e){this.googleError.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
  async subir(event:Event){
    const input=event.target as HTMLInputElement;
    if(this.busy()||!this.editing()){input.value='';return;}
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
    if(this.busy()||!this.editing()||!this.hasPhoto())return;
    this.busy.set(true);this.error.set('');this.message.set('');
    try{await this.api.borrarFoto();this.limpiarFoto();this.hasPhoto.set(false);
      this.message.set('Foto eliminada del perfil.');}
    catch(e){this.error.set(this.mensajeError(e));}
    finally{this.busy.set(false);}
  }
}
