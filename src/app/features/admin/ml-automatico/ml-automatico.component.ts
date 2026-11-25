import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminApi, AjustesMlAutomatico, ConfigMlAutomatico, EventoMlAutomatico } from '../data-access/admin-api.service';

@Component({
  standalone:true,
  selector:'app-ml-automatico',
  imports:[CommonModule,FormsModule],
  templateUrl:'./ml-automatico.html'
})
export class MlAutomaticoComponent implements OnInit {
  private api=inject(AdminApi);
  config:ConfigMlAutomatico|null=null;
  ajustes:AjustesMlAutomatico={habilitado:false,horas:168,hora:3,minNuevos:10};
  historial:EventoMlAutomatico[]=[];
  cargando=false;
  guardando=false;
  error='';
  mensaje='';
  readonly frecuencias=[{valor:12,texto:'Cada 12 horas'},{valor:24,texto:'Cada día'},{valor:72,texto:'Cada 3 días'},{valor:168,texto:'Cada semana'}];
  readonly horas=Array.from({length:24},(_,i)=>i);
  ngOnInit(){void this.cargar();}
  get cambios():boolean {
    const c=this.config,a=this.ajustes;
    return !!c&&(c.habilitado!==a.habilitado||c.horas!==a.horas||c.hora!==a.hora||c.minNuevos!==a.minNuevos);
  }
  get valido():boolean {return [12,24,72,168].includes(this.ajustes.horas)&&Number.isInteger(this.ajustes.hora)&&this.ajustes.hora>=0&&this.ajustes.hora<=23&&Number.isInteger(this.ajustes.minNuevos)&&this.ajustes.minNuevos>=1&&this.ajustes.minNuevos<=1000;}
  get ultima():EventoMlAutomatico|undefined{return this.historial.find(x=>x.estado!=='EN_CURSO');}
  get ultimoEntrenamiento():EventoMlAutomatico|undefined{return this.historial.find(x=>x.estado==='COMPLETADO');}
  get frecuenciaTexto():string{return this.frecuencias.find(x=>x.valor===this.config?.horas)?.texto??'—';}
  horaTexto(n:number):string{return String(n).padStart(2,'0')+':00';}
  etiqueta(e:EventoMlAutomatico['estado']):string{return {EN_CURSO:'En proceso',COMPLETADO:'Entrenado',OMITIDO:'Omitido',ERROR:'Error'}[e];}
  duracion(e:EventoMlAutomatico):string{
    if(!e.fin)return '—';
    const s=Math.max(0,Math.round((Date.parse(e.fin)-Date.parse(e.inicio))/1000));
    return s<60?s+' s':Math.floor(s/60)+' min '+s%60+' s';
  }
  private aplicar(c:ConfigMlAutomatico){this.config=c;this.ajustes={habilitado:c.habilitado,horas:c.horas,hora:c.hora,minNuevos:c.minNuevos};}
  private fallo(e:unknown):string{
    return e instanceof HttpErrorResponse&&e.status===409?'Hay un entrenamiento en curso. Actualiza cuando finalice.':'No se pudo consultar o guardar la programación. Comprueba que el backend esté actualizado y disponible.';
  }
  async cargar(){
    if(this.cargando||this.guardando)return;
    if(this.cambios&&!window.confirm('¿Descartar los cambios sin guardar y consultar la configuración actual?'))return;
    this.cargando=true;this.error='';this.mensaje='';
    try{const r=await this.api.estadoMlAutomatico();this.aplicar(r.config);this.historial=r.historial;}
    catch(e){this.error=this.fallo(e);}
    finally{this.cargando=false;}
  }
  async guardar(){
    if(this.guardando||this.cargando||!this.config||!this.cambios||!this.valido)return;
    this.guardando=true;this.error='';this.mensaje='';
    try{this.aplicar(await this.api.guardarMlAutomatico({...this.ajustes}));this.mensaje=this.config?.habilitado?'Programación guardada. El servidor comprobará los datos en la fecha indicada.':'Entrenamiento automático desactivado.';}
    catch(e){this.error=this.fallo(e);}
    finally{this.guardando=false;}
  }
}
