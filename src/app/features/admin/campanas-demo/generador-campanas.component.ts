import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AdminApi, EjecucionAcademica, FuenteMlInfo } from '../data-access/admin-api.service';
import { CampanasDemoComponent, recomendarCampana } from './campanas-demo.component';

@Component({
  standalone: true,
  selector: 'app-generador-campanas',
  imports: [CommonModule, CampanasDemoComponent],
  templateUrl: './generador-campanas.html'
})
export class GeneradorCampanasComponent implements OnInit {
  private api = inject(AdminApi);
  ejecucion?: EjecucionAcademica;
  fuente?: FuenteMlInfo;
  cargando = false;
  error = '';
  mensaje = '';
  ngOnInit(): void { void this.cargar(); }
  get segmentos() { return this.ejecucion?.resultado.segmentos ?? []; }
  get perfiles(): number { return this.segmentos.reduce((s,x)=>s+x.clientes,0); }
  get recencia(): number | null {
    return this.perfiles ? this.segmentos.reduce((s,x)=>s+x.clientes*(x.dias_desde_ultima_compra_promedio??0),0)/this.perfiles : null;
  }
  get gasto(): number | null {
    return this.perfiles ? this.segmentos.reduce((s,x)=>s+x.clientes*x.gasto_promedio_soles,0)/this.perfiles : null;
  }
  get compras(): number | null {
    return this.perfiles ? this.segmentos.reduce((s,x)=>s+x.clientes*x.compras_promedio,0)/this.perfiles : null;
  }
  get kmeans() { return this.ejecucion?.resultado.algoritmos?.['kmeans']; }
  get dbscan() { return this.ejecucion?.resultado.algoritmos?.['dbscan']; }
  get prioridades(): number {
    return this.segmentos.filter(x=>recomendarCampana(x).prioridad==='Alta').length;
  }
  async cargar(forzar=false, activar=false): Promise<void> {
    if(this.cargando) return;
    this.cargando=true; this.error=''; this.mensaje='';
    try {
      this.fuente=(await this.api.fuentesMl()).find(x=>x.modulo==='CLUSTERING');
      if(activar && this.fuente?.fuente!=='PRUEBA') this.fuente=await this.api.configurarFuenteMl('CLUSTERING','PRUEBA');
      if(this.fuente?.fuente!=='PRUEBA') { this.ejecucion=undefined; return; }
      if(!this.fuente.datasetImplementado || !this.fuente.registrosDisponibles) { this.ejecucion=undefined; this.error='El dataset de prueba no está disponible.'; return; }
      const previa=(await this.api.resultadosModulosMl()).find(x=>x.modulo==='CLUSTERING'&&x.fuente==='PRUEBA');
      const resultado=forzar||!previa?.resultado.segmentos?.length ? await this.api.ejecutarModuloMl('CLUSTERING') : previa;
      if(resultado.fuente!=='PRUEBA'||resultado.modulo!=='CLUSTERING') throw new Error('Fuente incompatible');
      this.ejecucion=resultado;
      this.mensaje=forzar?'Segmentación actualizada.':'Segmentación cargada.';
    } catch { this.ejecucion=undefined; this.error='No se pudo cargar la segmentación. Verifica la fuente de datos y la conexión con Monarca-ML.'; }
    finally { this.cargando=false; }
  }
}
