import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, MetodoPagoEditable, MetodoPagoDraft } from '../data-access/admin-api.service';

@Component({
  standalone:true,selector:'app-admin-payments',
  imports:[CommonModule,FormsModule],templateUrl:'./admin-payments.html'
})
export class AdminPaymentsComponent implements OnInit {
  private api=inject(AdminApi);
  metodos:MetodoPagoEditable[]=[];
  drafts:Record<number,MetodoPagoDraft>={};
  busy=false;
  savingId:number|null=null;
  uploadingId:number|null=null;
  error='';
  message='';

  ngOnInit(){void this.cargar();}
  async cargar(){
    this.busy=true;this.error='';
    try{
      this.metodos=await this.api.listarMetodos();
      this.drafts=Object.fromEntries(this.metodos.map(m=>[m.idMetodoPago,{
        activo:m.activo,telefonoYape:m.telefonoYape||'',qrUrl:m.qrUrl||'',
        titular:m.titular||'',banco:m.banco||'',numeroCuenta:m.numeroCuenta||'',cci:m.cci||''
      }]));
    }catch{this.error='No se pudieron cargar los métodos. Revisa la conexión y los permisos.';}
    finally{this.busy=false;}
  }
  async subirQr(event:Event, id:number){
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];input.value='';
    if(!file)return;
    this.error='';this.message='';
    if(!['image/jpeg','image/png'].includes(file.type)||file.size===0||file.size>5_000_000){
      this.error='Selecciona un QR en JPG o PNG de hasta 5 MB.';return;
    }
    this.uploadingId=id;
    try{
      const foto=await this.api.uploadProductImage(file);
      this.drafts[id].qrUrl=foto.url;
      this.message='QR cargado a Storage. Pulsa «Guardar configuración» para vincularlo al método Yape.';
    }catch{this.error='No se pudo subir el QR. Comprueba que el backend tenga la clave privada de Supabase Storage.';}
    finally{this.uploadingId=null;}
  }
  async guardar(m:MetodoPagoEditable){
    if(this.savingId!==null||this.uploadingId!==null)return;
    const f=this.drafts[m.idMetodoPago];
    if(!f)return;
    this.error='';this.message='';
    if(m.codigo==='YAPE'&&f.telefonoYape.trim()&&!/^9[0-9]{8}$/.test(f.telefonoYape.trim())){
      this.error='El celular Yape debe tener 9 dígitos y comenzar con 9.';return;
    }
    if(m.codigo==='TRANSFERENCIA'&&f.cci.trim()&&!/^[0-9]{20}$/.test(f.cci.trim())){
      this.error='El CCI debe tener 20 dígitos.';return;
    }
    this.savingId=m.idMetodoPago;
    try{
      const actualizado=await this.api.guardarMetodo(m.idMetodoPago,{
        activo:f.activo,telefonoYape:f.telefonoYape.trim(),qrUrl:f.qrUrl.trim(),
        titular:f.titular.trim(),banco:f.banco.trim(),numeroCuenta:f.numeroCuenta.trim(),cci:f.cci.trim()
      });
      this.metodos=this.metodos.map(x=>x.idMetodoPago===m.idMetodoPago?actualizado:x);
      this.message='Guardado. '+(actualizado.configurado
        ? 'El método ya tiene datos para mostrarse en el checkout.'
        : 'Aún faltan datos: el cliente no podrá seleccionarlo hasta completar la configuración.');
    }catch(e:any){
      this.error=typeof e?.error?.detail==='string'?e.error.detail:
        typeof e?.error?.message==='string'?e.error.message:
        'No fue posible guardar los cambios del método de pago.';
    }finally{this.savingId=null;}
  }
}
