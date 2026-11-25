import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemandaAnalisisComponent } from './demanda-analisis.component';
import { Producto } from '../../../core/models/shop.models';
import { asset } from '../../../core/utils/assets';
import { sugerirReposicion } from '../../../core/utils/stock-alertas';
import { AdminApi, EscenarioProductoDemanda, EjecucionAcademica, ResultadoSimulacionDemanda } from '../data-access/admin-api.service';

@Component({
  selector: 'app-prediccion-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, DemandaAnalisisComponent],
  templateUrl: './prediccion-ventas.html'
})
export class PrediccionVentasComponent implements OnInit {
  @Input() products: Producto[] = [];
  @Output() verInventario = new EventEmitter<void>();
  private api = inject(AdminApi);
  buscar = '';
  soloAlertas=false;
  categoria='';
  orden='reposicion';
  readonly fallback=asset('mariposa.png');
  personalizados=new Map<number,ResultadoSimulacionDemanda>();
  get categorias(){return [...new Set(this.products.map(p=>p.categoria))].sort();}
  demanda(p:Producto):number|undefined{return this.personalizados.get(p.idProducto)?.unidadesEscenario??this.resultados.get(p.idProducto);}
  get demandaTotal(){return this.products.reduce((s,p)=>s+(this.demanda(p)??0),0);}
  get stockTotal(){return this.products.reduce((s,p)=>s+(this.stock(p)??0),0);}
  consumo(p:Producto):number {
    const s=this.stock(p),d=this.demanda(p);
    return s===null||d===undefined?0:s===0?(d>0?100:0):Math.min(100,100*Math.ceil(d)/s);
  }
  escenarioActivo(p:Producto){
    const personalizado=this.personalizados.get(p.idProducto);
    const base=this.escenarios.get(p.idProducto);
    return personalizado?{precio:personalizado.precioSoles,descuento:personalizado.descuentoPorcentaje,visitas:personalizado.visitasSupuestas}:base?{precio:base.precioReferencia,descuento:base.descuentoSupuesto,visitas:base.visitasSupuestas}:null;
  }
  abrir(p:Producto):void {
    if(this.ocupado)return;
    if(this.producto?.idProducto===p.idProducto){this.producto=null;this.error='';return;}
    this.elegir(p);
  }
  restaurar(p:Producto):void {
    if(this.ocupado)return;
    this.personalizados.delete(p.idProducto);
    this.elegir(p);
  }
  textoBalance(p:Producto):string {
    const b=this.balance(p);
    return b===null?'Sin estimación':b<0?'Faltan '+(-b)+' un.':'Quedarían '+b+' un.';
  }
  reposicion(p:Producto){return sugerirReposicion(p,this.demanda(p));}
  get requierenReposicion(){return this.products.filter(p=>(this.reposicion(p).cantidad??0)>0).length;}
  get unidadesSugeridas(){return this.products.reduce((s,p)=>s+(this.reposicion(p).cantidad??0),0);}
  get alertasMinimo(){return this.products.reduce((s,p)=>s+this.reposicion(p).alertas,0);}
  producto: Producto | null = null;
  precio = 0;
  descuento = 0;
  visitas = 100;
  ocupado = false;
  error = '';
  resultados = new Map<number, number>();
  escenarios = new Map<number, EscenarioProductoDemanda>();
  ejecucion: EjecucionAcademica | null = null;
  cargando = false;
  fuentePrueba = false;
  errorCarga = '';
  personalizado: number | undefined;
  ngOnInit(): void { void this.cargar(); }
  async cargar(forzar = false, activar = false): Promise<void> {
    if(this.cargando || this.ocupado) return;
    this.cargando = true; this.errorCarga = ''; this.error = '';
    this.resultados.clear(); this.escenarios.clear(); this.personalizados.clear(); this.ejecucion = null;
    this.personalizado = undefined;
    try {
      const fuentes = await this.api.fuentesMl();
      let fuente = fuentes.find(x => x.modulo === 'DEMANDA');
      if(activar && fuente?.fuente !== 'PRUEBA') fuente = await this.api.configurarFuenteMl('DEMANDA','PRUEBA');
      this.fuentePrueba = fuente?.fuente === 'PRUEBA';
      if(!this.fuentePrueba) return;
      const prev = (await this.api.resultadosModulosMl()).find(x => x.modulo === 'DEMANDA' && x.fuente === 'PRUEBA');
      const e = !forzar && prev?.resultado.escenarios_producto?.length ? prev : await this.api.ejecutarModuloMl('DEMANDA');
      if(e.fuente !== 'PRUEBA') throw new Error('Fuente incompatible');
      this.ejecucion = e;
      for(const s of e.resultado.escenarios_producto ?? []) {
        if(Number.isFinite(s.unidadesEscenario) && s.unidadesEscenario >= 0) {
          this.escenarios.set(s.idProducto,s);
          this.resultados.set(s.idProducto,s.unidadesEscenario);
        }
      }
      if(!this.resultados.size) this.errorCarga = 'El modelo no devolvió escenarios por producto. Revisa el dataset de prueba.';
      if(this.producto) this.elegir(this.producto);
    } catch { this.errorCarga = 'No se pudieron obtener las estimaciones. Comprueba el dataset de prueba y la conexión con Monarca-ML.'; }
    finally { this.cargando = false; }
  }
  get coincidencias(): number { return this.products.filter(p => this.resultados.has(p.idProducto)).length; }
  balance(p: Producto): number | null {
    const s=this.stock(p), d=this.demanda(p);
    return s===null || d===undefined ? null : s-Math.ceil(d);
  }
  get filtrados(): Producto[] {
    const q = this.buscar.trim().toLowerCase();
    return this.products.filter(p => (p.nombre + ' ' + p.categoria).toLowerCase().includes(q)&&(!this.categoria||p.categoria===this.categoria)&&(!this.soloAlertas||this.reposicion(p).alertas>0||(this.reposicion(p).cantidad??0)>0)).sort((a,b)=>{
      if(this.orden==='nombre')return a.nombre.localeCompare(b.nombre,'es');
      if(this.orden==='stock')return (this.stock(a)??Infinity)-(this.stock(b)??Infinity)||a.nombre.localeCompare(b.nombre,'es');
      if(this.orden==='demanda')return (this.demanda(b)??-1)-(this.demanda(a)??-1)||a.nombre.localeCompare(b.nombre,'es');
      return (this.reposicion(b).cantidad??0)-(this.reposicion(a).cantidad??0)||this.reposicion(b).alertas-this.reposicion(a).alertas||a.nombre.localeCompare(b.nombre,'es');
    });
  }
  stock(p: Producto): number | null {
    return p.variantes?.length ? p.variantes.reduce((s,v) => s + Math.max(0, Number(v.stock)||0),0) : null;
  }
  elegir(p: Producto): void {
    this.producto = p;
    const s = this.escenarioActivo(p);
    this.precio = s?.precio ?? p.precioBase;
    this.descuento = s?.descuento ?? 0;
    this.visitas = s?.visitas ?? 100;
    this.personalizado = this.demanda(p);
    this.error = '';
  }
  get estimado(): number | undefined { return this.personalizado; }
  get restante(): number | null {
    const s = this.producto ? this.stock(this.producto) : null;
    return s === null || this.estimado === undefined ? null : s - Math.ceil(this.estimado);
  }
  invalidar(): void { this.personalizado = undefined; this.error = ''; }
  async calcular(): Promise<void> {
    if(this.ocupado || this.cargando || !this.producto || !this.fuentePrueba || !this.escenarios.has(this.producto.idProducto)) return;
    this.invalidar();
    const id = this.producto.idProducto;
    if(!Number.isFinite(this.precio)||this.precio<0.01||this.precio>10000||!Number.isFinite(this.descuento)||this.descuento<0||this.descuento>100||!Number.isInteger(this.visitas)||this.visitas<0||this.visitas>100000) {
      this.error='Revisa el precio, descuento (0–100 %) y visitas semanales (0–100000).'; return;
    }
    this.ocupado=true;
    try {
      const r = await this.api.simularDemanda({idProducto:id,precioSoles:this.precio,descuentoPorcentaje:this.descuento,visitasSemana:this.visitas});
      if(r.resultado.idProducto!==id || !Number.isFinite(r.resultado.unidadesEscenario)||r.resultado.unidadesEscenario<0) throw new Error('Resultado inválido');
      this.personalizados.set(id,r.resultado);
      this.personalizado = r.resultado.unidadesEscenario;
    } catch { this.error='No se pudo estimar este producto. Comprueba que la fuente DEMANDA sea PRUEBA, que el dataset incluya el producto y que el servicio ML esté disponible.'; }
    finally { this.ocupado=false; }
  }
}
