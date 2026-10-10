import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, asset } from '../store';

type Modo='login'|'registro'|'recuperar'|'restablecer';
@Component({standalone:true,selector:'app-auth',imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./auth.html'})
export class AuthPage implements OnInit{
  api=inject(Api);router=inject(Router);
  logo=asset('logo-desktop.png');
  mode=signal<Modo>('login');
  busy=signal(false);
  message=signal('');isError=signal(false);
  showPassword=signal(false);
  nombre='';apellido='';email='';password='';confirmPassword='';
  private resetToken:string|null=null;
  ngOnInit(){
    const fragment=window.location.hash;
    if(fragment.startsWith('#restablecer=')){
      this.resetToken=decodeURIComponent(fragment.slice('#restablecer='.length));
      window.history.replaceState(null,'',window.location.pathname+'#restablecer');
      this.mode.set('restablecer');
    }else if(fragment==='#registro')this.mode.set('registro');
    else if(fragment==='#recuperar')this.mode.set('recuperar');
  }
  resetTokenValid(){return !!this.resetToken;}
  setMode(m:Modo){
    this.mode.set(m);this.message.set('');this.isError.set(false);
    window.history.replaceState(null,'',window.location.pathname+(m==='login'?'':'#'+m));
  }
  private errorMessage(e:unknown){
    if(e instanceof HttpErrorResponse){
      if(e.status===0)return 'No se pudo conectar con el backend.';
      if(e.status===401)return 'Correo o contraseña incorrectos.';
      return e.error?.error||e.error?.mensaje||(typeof e.error==='string'?e.error:'No se pudo completar la solicitud.');
    }
    return e instanceof Error?e.message:'Ocurrió un error.';
  }
  async submit(){
    if(this.busy())return;
    this.message.set('');this.isError.set(false);
    const mode=this.mode();
    if((mode==='registro'||mode==='restablecer') &&
       (this.password!==this.confirmPassword)){this.fail('Las contraseñas no coinciden.');return;}
    if((mode==='registro'||mode==='restablecer') &&
       (this.password.length<8||new TextEncoder().encode(this.password).length>72)){
       this.fail('La contraseña debe tener al menos 8 caracteres y máximo 72 bytes.');return;
    }
    if(mode==='restablecer'&&!this.resetToken){this.fail('El enlace es inválido. Solicita uno nuevo.');return;}
    this.busy.set(true);
    try{
      const path=mode==='login'?'login':mode==='registro'?'registro':mode==='recuperar'?'olvide-password':'restablecer-password';
      const data=mode==='login'?{email:this.email.trim(),password:this.password}:
        mode==='registro'?{nombre:this.nombre.trim(),apellido:this.apellido.trim(),email:this.email.trim(),password:this.password}:
        mode==='recuperar'?{email:this.email.trim()}:{token:this.resetToken,password:this.password};
      const response=await this.api.auth(path,data);
      if(mode==='login'){
        if(!response.token)throw new Error('El servidor no envió el token de sesión.');
        localStorage.setItem('token_monarca',response.token);
        localStorage.setItem('rol_monarca',response.rol||'');
        await this.router.navigateByUrl(response.rol==='ROLE_ADMIN'?'/admin':'/');
      }else{
        if(mode==='registro'||mode==='restablecer'){
          if(mode==='restablecer'){
            this.resetToken=null;localStorage.removeItem('token_monarca');localStorage.removeItem('rol_monarca');
          }
          this.password='';this.confirmPassword='';this.setMode('login');
          this.message.set(response.mensaje||'Operación completada. Ya puedes iniciar sesión.');
        }else this.message.set(response.mensaje||'Si el correo existe, recibirás un enlace.');
      }
    }catch(e){this.fail(this.errorMessage(e));}
    finally{this.busy.set(false);}
  }
  private fail(m:string){this.isError.set(true);this.message.set(m);}
}
