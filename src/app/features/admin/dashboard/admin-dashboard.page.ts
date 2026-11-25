import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../../core/models/shop.models';
import { AdminApi, PeriodoVentas } from '../data-access/admin-api.service';

type VentaDia = PeriodoVentas['ventasDiarias'][number];
export type PuntoVenta = { etiqueta:string; desde:string; hasta:string; real:number; estimado:number|null; pedidos:number };
const DAY = 86400000;
function diaNumero(fecha:string):number { return Date.parse(fecha+'T00:00:00Z')/DAY; }
export function moverDia(fecha:string, delta:number):string { return new Date((diaNumero(fecha)+delta)*DAY).toISOString().slice(0,10); }

/** Estimación retrospectiva: cada bloque usa únicamente fechas anteriores a su inicio.
 * El historial se consulta con el estado de pago actual; no equivale a predicciones archivadas.
 * No se usa el dataset sintético de demanda por producto.
 */
export function estimarBloque(historial:VentaDia[], bloque:VentaDia[]):number|null {
  if(!bloque.length) return null;
  const inicio=diaNumero(bloque[0].fecha);
  let prev=historial.filter(d=>diaNumero(d.fecha)<inicio && diaNumero(d.fecha)>=inicio-90)
    .sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const primera=prev.findIndex(d=>Number(d.pedidos)>0);
  if(primera<0) return null;
  prev=prev.slice(primera);
  if(prev.length<28 || prev.filter(d=>Number(d.pedidos)>0).length<4) return null;
  const xs=prev.map(d=>diaNumero(d.fecha)-inicio), ys=prev.map(d=>Number(d.importe));
  if(ys.some(y=>!Number.isFinite(y)||y<0))return null;
  const n=xs.length, mx=xs.reduce((s,x)=>s+x,0)/n, my=ys.reduce((s,y)=>s+y,0)/n;
  const den=xs.reduce((s,x)=>s+(x-mx)**2,0);
  if(!den)return null;
  const m=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/den;
  const b=my-m*mx;
  return Math.round(bloque.reduce((s,d)=>s+Math.max(0,b+m*(diaNumero(d.fecha)-inicio)),0)*100)/100;
}
export function puntosVentas(dias:VentaDia[], previos:VentaDia[], mensual:boolean):PuntoVenta[] {
  const orden=[...dias].sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const grupos:VentaDia[][]=[];
  const semanal=!mensual&&orden.length>31;
  for(const d of orden){
    const ultimo=grupos[grupos.length-1];
    if(!ultimo || (mensual?ultimo[0].fecha.slice(0,7)!==d.fecha.slice(0,7):semanal?ultimo.length>=7:true)) grupos.push([d]);
    else ultimo.push(d);
  }
  const historia=[...previos,...orden];
  return grupos.map(g=>{
    const desde=g[0].fecha,hasta=g[g.length-1].fecha;
    const fmt=(d:string)=>d.slice(8,10)+'/'+d.slice(5,7);
    const etiqueta=mensual?new Date(desde+'T00:00:00Z').toLocaleDateString('es-PE',{month:'short',year:'2-digit',timeZone:'UTC'}):fmt(desde)+(desde!==hasta?'–'+fmt(hasta):'');
    return {etiqueta,desde,hasta,real:g.reduce((s,d)=>s+Number(d.importe||0),0),pedidos:g.reduce((s,d)=>s+Number(d.pedidos||0),0),estimado:estimarBloque(historia,g)};
  });
}

const COLORES = ['#22d3ee','#f472b6','#a78bfa','#fbbf24','#34d399','#60a5fa'];

function fechaLima(haceDias=0): string {
  const momento = new Date(Date.now()-haceDias*86400000-5*3600000);
  return momento.toISOString().slice(0,10);
}

@Component({
  standalone:true,
  selector:'app-admin-dashboard',
  imports:[CommonModule,FormsModule],
  templateUrl:'./admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private api=inject(AdminApi);
  @Input() products:Producto[]=[];
  @Output() verInventario=new EventEmitter<void>();
  @Output() abrirMl=new EventEmitter<void>();
  desde=fechaLima(29);
  hasta=fechaLima();
  periodo=30;
  modo:'mes'|'anio'|'rango'='rango';
  mes=fechaLima().slice(0,7);
  anio=Number(fechaLima().slice(0,4));
  readonly hoy=fechaLima();
  puntos:PuntoVenta[]=[];
  mostrarMl=true;
  puntoActivo:number|null=null;
  historialError=false;
  busy=false;
  error='';
  reporte:PeriodoVentas|null=null;
  readonly colores=COLORES;

  ngOnInit(){void this.cargar();}
  usarPeriodo(dias:number){
    this.modo='rango';
    this.periodo=dias;
    this.desde=fechaLima(dias-1);
    this.hasta=fechaLima();
    void this.cargar();
  }
  aplicarModo(){
    this.periodo=0;
    if(this.modo==='mes'){
      if(!/^\d{4}-\d{2}$/.test(this.mes)||this.mes>this.hoy.slice(0,7)){this.error='Elige un mes válido, no futuro.';return;}
      this.desde=this.mes+'-01';
      const [y,m]=this.mes.split('-').map(Number);
      this.hasta=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
    }else if(this.modo==='anio'){
      if(!Number.isInteger(this.anio)||this.anio<2000||this.anio>Number(this.hoy.slice(0,4))){this.error='Elige un año válido, no futuro.';return;}
      this.desde=this.anio+'-01-01';this.hasta=this.anio+'-12-31';
    }
    if(this.modo!=='rango'&&this.hasta>this.hoy)this.hasta=this.hoy;
    void this.cargar();
  }
  async cargar(){
    if(this.busy)return;
    this.error='';
    if(!this.desde||!this.hasta||this.desde>this.hasta||this.hasta>this.hoy){
      this.error='Selecciona un intervalo de fechas válido.';return;
    }
    const a=new Date(this.desde+'T00:00:00Z'),b=new Date(this.hasta+'T00:00:00Z');
    if((b.getTime()-a.getTime())/86400000>365){
      this.error='El periodo máximo es de 366 días.';return;
    }
    this.busy=true;
    this.historialError=false;
    try{
      const desde=this.desde,hasta=this.hasta;
      const [reporte,previos]=await Promise.all([this.api.reportesVentas(desde,hasta),this.api.reportesVentas(moverDia(desde,-90),moverDia(desde,-1)).catch(()=>null)]);
      this.reporte=reporte;this.historialError=!previos;this.puntoActivo=null;
      this.puntos=puntosVentas(reporte.ventasDiarias,previos?.ventasDiarias??[],this.modo==='anio'||reporte.ventasDiarias.length>92);
    }
    catch{this.error='No se pudieron consultar los indicadores. Comprueba la conexión con el backend y los permisos de administrador.';}
    finally{this.busy=false;}
  }
  dinero(n:number):string {return 'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});}
  get maxGrafico():number {return Math.max(1,...this.puntos.flatMap(p=>[p.real,this.mostrarMl?p.estimado??0:0]));}
  get hayMl():boolean {return this.puntos.some(p=>p.estimado!==null);}
  get anchoGrafico():number {return Math.max(640,72+this.puntos.length*25);}
  x(i:number):number {return this.puntos.length===1?this.anchoGrafico/2:68+i*(this.anchoGrafico-94)/(this.puntos.length-1);}
  y(v:number):number {return 196-164*v/this.maxGrafico;}
  linea(estimado:boolean):string {
    let d='', anterior=false;
    this.puntos.forEach((p,i)=>{const v=estimado?p.estimado:p.real;if(v===null){anterior=false;return;}d+=(anterior?' L':' M')+this.x(i)+' '+this.y(v);anterior=true;});
    return d;
  }
  get puntoSeleccionado():PuntoVenta|null {
    const i=this.puntoActivo??this.puntos.length-1;
    return this.puntos[i]??null;
  }
  area(estimado:boolean):string {
    const partes:string[]=[];
    let inicio=-1, ultimo=-1, d='';
    const cerrar=()=>{
      if(inicio>=0&&ultimo>inicio) partes.push(d+' L'+this.x(ultimo)+' 196 L'+this.x(inicio)+' 196 Z');
      inicio=-1;ultimo=-1;d='';
    };
    this.puntos.forEach((p,i)=>{
      const valor=estimado?p.estimado:p.real;
      if(valor===null){cerrar();return;}
      if(inicio<0){inicio=i;d='M'+this.x(i)+' '+this.y(valor);}
      else d+=' L'+this.x(i)+' '+this.y(valor);
      ultimo=i;
    });
    cerrar();
    return partes.join(' ');
  }
  porcentajeMedio(importe:number):number {return this.totalMedios()>0?100*importe/this.totalMedios():0;}
  porcentajePagados():number|null {
    const k=this.reporte?.kpis;
    return k&&k.pedidosRegistrados>0?100*k.pedidosConfirmados/k.pedidosRegistrados:null;
  }
  etiquetaEje(i:number):boolean {return i===0||i===this.puntos.length-1||i%Math.max(1,Math.ceil(this.puntos.length/8))===0;}
  totalMedios():number{return (this.reporte?.mediosPago||[]).reduce((s,x)=>s+Number(x.importe),0);}
  graficoCircular():string{
    const medios=this.reporte?.mediosPago||[];
    const total=this.totalMedios();
    if(total<=0)return 'conic-gradient(#334155 0% 100%)';
    let acumulado=0;
    const partes=medios.map((x,i)=>{
      const hasta=acumulado+100*Number(x.importe)/total;
      const pieza=COLORES[i%COLORES.length]+' '+acumulado+'% '+hasta+'%';
      acumulado=hasta;
      return pieza;
    });
    return 'conic-gradient('+partes.join(',')+')';
  }
  estados():Array<{estado:string;cantidad:number;porcentaje:number}>{
    const valores=this.reporte?.estados||[];
    const total=valores.reduce((s,x)=>s+Number(x.cantidad),0)||1;
    return valores.map(x=>({...x,porcentaje:100*x.cantidad/total}));
  }
  etiquetaEstado(estado:string):string{
    const etiquetas:Record<string,string>={PENDIENTE_PAGO:'Pendiente de pago',
      PENDIENTE_CONFIRMACION:'Evidencia en revisión',CONFIRMADO:'Confirmado',
      EN_PREPARACION:'En preparación',EN_CAMINO:'En camino',FINALIZADO:'Finalizado',CANCELADO:'Cancelado'};
    return etiquetas[estado]||estado.replace(/_/g,' ');
  }
  productosCriticos():Array<{nombre:string;stock:number;minimo:number}>{
    return this.products.flatMap(p=>(p.variantes||[]).filter(v=>v.stock<=Number(v.stockMinimo??0))
      .map(v=>({nombre:p.nombre+' · '+v.talla+' / '+v.color,stock:v.stock,minimo:v.stockMinimo??0})))
      .sort((a,b)=>a.stock-b.stock).slice(0,6);
  }
  maxTop():number{return Math.max(1,...(this.reporte?.topProductos||[]).map(p=>Number(p.unidades)));}
}
