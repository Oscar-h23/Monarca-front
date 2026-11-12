import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../../core/models/shop.models';
import { AdminApi, PeriodoVentas } from '../data-access/admin-api.service';

type Barra = { etiqueta:string; importe:number; pedidos:number; porcentaje:number };
const COLORES = ['#18181b','#9f806e','#64748b','#9274b1','#b5a084','#6b8f84'];

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
  desde=fechaLima(29);
  hasta=fechaLima();
  periodo=30;
  busy=false;
  error='';
  reporte:PeriodoVentas|null=null;
  readonly colores=COLORES;

  ngOnInit(){void this.cargar();}
  usarPeriodo(dias:number){
    this.periodo=dias;
    this.desde=fechaLima(dias-1);
    this.hasta=fechaLima();
    void this.cargar();
  }
  async cargar(){
    this.error='';
    if(!this.desde||!this.hasta||this.desde>this.hasta){
      this.error='Selecciona un intervalo de fechas válido.';return;
    }
    const a=new Date(this.desde+'T00:00:00Z'),b=new Date(this.hasta+'T00:00:00Z');
    if((b.getTime()-a.getTime())/86400000>365){
      this.error='El periodo máximo es de 366 días.';return;
    }
    this.busy=true;
    try{this.reporte=await this.api.reportesVentas(this.desde,this.hasta);}
    catch{this.error='No se pudieron consultar los indicadores. Comprueba la conexión con el backend y los permisos de administrador.';}
    finally{this.busy=false;}
  }
  dinero(n:number):string {return 'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});}
  barras():Barra[]{
    const dias=this.reporte?.ventasDiarias||[];
    if(!dias.length)return [];
    const grupo=Math.max(1,Math.ceil(dias.length/12));
    const agrupadas:Barra[]=[];
    for(let i=0;i<dias.length;i+=grupo){
      const bloque=dias.slice(i,i+grupo);
      const primer=bloque[0].fecha,ultimo=bloque[bloque.length-1].fecha;
      const etiqueta=primer.slice(8,10)+'/'+primer.slice(5,7)+(primer!==ultimo?' – '+ultimo.slice(8,10)+'/'+ultimo.slice(5,7):'');
      agrupadas.push({etiqueta,importe:bloque.reduce((a,x)=>a+Number(x.importe||0),0),
        pedidos:bloque.reduce((a,x)=>a+Number(x.pedidos||0),0),porcentaje:0});
    }
    const max=Math.max(...agrupadas.map(x=>x.importe),1);
    return agrupadas.map(x=>({...x,porcentaje:100*x.importe/max}));
  }
  totalMedios():number{return (this.reporte?.mediosPago||[]).reduce((s,x)=>s+Number(x.importe),0);}
  graficoCircular():string{
    const medios=this.reporte?.mediosPago||[];
    const total=this.totalMedios();
    if(total<=0)return 'conic-gradient(#e4e4e7 0% 100%)';
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
