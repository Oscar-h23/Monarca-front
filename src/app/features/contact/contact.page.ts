import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { asset } from '../../core/utils/assets';
@Component({standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./contact.html'})
export class ContactPage {
  banner=asset('contactanos_img/Portada1_contacto.png');
  image=asset('contactanos_img/formulario_contacto.png');
  first='';last='';email='';comment='';
  info=signal('');
  send(){
    if(!this.first.trim()||!this.last.trim()||!this.comment.trim())return;
    const subject='Consulta de '+this.first.trim()+' '+this.last.trim();
    const body=this.comment.trim()+'\n\nRemitente: '+this.first.trim()+' '+this.last.trim()+'\nCorreo: '+this.email.trim();
    // El sitio original no tiene un endpoint /contacto.
    // Abrir un borrador en el cliente de correo, sin afirmar que se envió.
    window.location.href='mailto:monarca_atencion@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    this.info.set('Se abrirá tu aplicación de correo para revisar y enviar el mensaje.');
  }
}
