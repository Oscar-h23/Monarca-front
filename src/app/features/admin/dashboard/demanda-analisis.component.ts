import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../../core/models/shop.models';
import {
  AdminApi, EjecucionAcademica, EjemploDemanda,
  EscenarioProductoDemanda, ResultadoSimulacionDemanda
} from '../data-access/admin-api.service';

interface FilaCobertura {
  idProducto: number;
  nombre: string;
  imagen: string;
  stock: number | null;
  unidades: number;
  visitas: number;
  descuento: number;
  precio: number;
  falta: number | null;
  personalizada: boolean;
}

@Component({
  standalone: true,
  selector: 'app-demanda-analisis',
  imports: [CommonModule, FormsModule],
  templateUrl: './demanda-analisis.html'
})
export class DemandaAnalisisComponent implements OnChanges {
  private readonly api = inject(AdminApi);

  @Input() ejecucion?: EjecucionAcademica;
  @Input() products: Producto[] = [];
  @Input() ejecutando = false;
  @Input() fuenteDisponible = false;
  @Output() actualizar = new EventEmitter<void>();
  @Output() verInventario = new EventEmitter<void>();

  idProducto = 0;
  precioSoles = 49.9;
  descuentoPorcentaje = 0;
  visitasSemana = 100;
  procesando = false;
  mensaje = '';
  error = '';
  resultadoPersonalizado: ResultadoSimulacionDemanda | null = null;
  private ultimaEjecucion: number | null = null;

  ngOnChanges(_changes: SimpleChanges): void {
    const id = this.ejecucion?.idEjecucion ?? null;
    if (this.ultimaEjecucion !== id) {
      this.ultimaEjecucion = id;
      this.resultadoPersonalizado = null;
      this.mensaje = '';
      this.error = '';
      const escenarios = this.escenarios;
      if (escenarios.length) {
        const coincidente = escenarios.find(s => this.products.some(p => p.idProducto === s.idProducto));
        this.seleccionarProducto((coincidente || escenarios[0]).idProducto);
      }
    }
  }

  get escenarios(): EscenarioProductoDemanda[] {
    return this.ejecucion?.resultado.escenarios_producto ?? [];
  }

  get ejemplos(): EjemploDemanda[] {
    return (this.ejecucion?.resultado.ejemplos ?? []).filter(x =>
      Number.isFinite(Number(x.real)) && Number.isFinite(Number(x.estimado))
    ).slice(0, 16);
  }

  get maxEjemplo(): number {
    return Math.max(1, ...this.ejemplos.flatMap(x => [Number(x.real), Number(x.estimado)]));
  }

  get mae(): number | null {
    const n = this.ejecucion?.resultado.mae_unidades;
    return n == null || !Number.isFinite(Number(n)) ? null : Number(n);
  }

  get maeBase(): number | null {
    const n = this.ejecucion?.resultado.mae_baseline_unidades;
    return n == null || !Number.isFinite(Number(n)) ? null : Number(n);
  }

  get mejoraMae(): number | null {
    const base = this.maeBase, actual = this.mae;
    return base != null && actual != null && base > 0 ? (base - actual) / base * 100 : null;
  }

  get hayCorrespondencia(): boolean {
    return this.tabla.some(x => x.stock !== null);
  }

  get tabla(): FilaCobertura[] {
    const resultado = this.resultadoPersonalizado;
    return this.escenarios.map(e => {
      const producto = this.products.find(p => p.idProducto === e.idProducto);
      const stock = producto
        ? (producto.variantes ?? []).reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0)
        : null;
      const personalizada = resultado?.idProducto === e.idProducto;
      const unidades = Number(personalizada ? resultado.unidadesEscenario : e.unidadesEscenario);
      return {
        idProducto: e.idProducto,
        nombre: producto?.nombre || 'Producto simulado #' + e.idProducto,
        imagen: producto?.imagen || '',
        stock,
        unidades: Number.isFinite(unidades) ? Math.max(0, unidades) : 0,
        visitas: personalizada ? resultado.visitasSupuestas : Number(e.visitasSupuestas),
        descuento: personalizada ? resultado.descuentoPorcentaje : Number(e.descuentoSupuesto),
        precio: personalizada ? resultado.precioSoles : Number(e.precioReferencia),
        falta: stock === null ? null : Math.max(0, Math.ceil(unidades) - stock),
        personalizada: !!personalizada
      };
    }).sort((a,b) => (b.falta ?? -1) - (a.falta ?? -1) || b.unidades - a.unidades);
  }

  seleccionarProducto(id: number): void {
    this.idProducto = Number(id);
    const escenario = this.escenarios.find(e => e.idProducto === this.idProducto);
    if (escenario) {
      this.precioSoles = Number(escenario.precioReferencia);
      this.descuentoPorcentaje = Number(escenario.descuentoSupuesto);
      this.visitasSemana = Number(escenario.visitasSupuestas);
    }
    this.invalidar();
  }

  invalidar(): void {
    this.resultadoPersonalizado = null;
    this.error = '';
    this.mensaje = '';
  }

  altura(valor: number): number {
    return Math.max(0, Math.min(100, 100 * Math.max(0, Number(valor) || 0) / this.maxEjemplo));
  }

  async simular(): Promise<void> {
    if (this.procesando || this.ejecutando || this.ejecucion?.fuente !== 'PRUEBA') return;
    const valido = this.escenarios.some(e => e.idProducto === this.idProducto)
      && Number.isFinite(this.precioSoles) && this.precioSoles >= 0.01 && this.precioSoles <= 10000
      && Number.isFinite(this.descuentoPorcentaje) && this.descuentoPorcentaje >= 0 && this.descuentoPorcentaje <= 100
      && Number.isInteger(this.visitasSemana) && this.visitasSemana >= 0 && this.visitasSemana <= 100000;
    if (!valido) {
      this.error = 'Selecciona un producto simulado y valores válidos (precio > 0, descuento 0–100 %, visitas 0–100000).';
      return;
    }
    this.procesando = true;
    this.mensaje = ''; this.error = '';
    try {
      const respuesta = await this.api.simularDemanda({
        idProducto: this.idProducto,
        precioSoles: this.precioSoles,
        descuentoPorcentaje: this.descuentoPorcentaje,
        visitasSemana: this.visitasSemana
      });
      if (respuesta.resultado.idProducto !== this.idProducto) throw new Error('Respuesta no corresponde al producto');
      this.resultadoPersonalizado = respuesta.resultado;
      this.mensaje = 'Escenario de prueba calculado. No se actualizaron pedidos, ventas, precios ni inventario.';
    } catch {
      this.error = 'No se pudo generar el escenario. Verifica que el backend y Monarca-ML estén actualizados y la fuente sea PRUEBA.';
    } finally {
      this.procesando = false;
    }
  }
}
