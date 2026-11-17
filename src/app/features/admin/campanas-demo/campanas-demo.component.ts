import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EjecucionAcademica } from '../data-access/admin-api.service';

type TipoCampana = 'REACTIVACION' | 'FIDELIZACION' | 'DESCUBRIMIENTO';
type Segmento = NonNullable<EjecucionAcademica['resultado']['segmentos']>[number];
type EstadoCampana = 'BORRADOR' | 'SIMULADA';

interface RecomendacionCampana {
  segmento: Segmento;
  tipo: TipoCampana;
  nombre: string;
  motivo: string;
  accion: string;
  prioridad: 'Alta' | 'Media' | 'Exploratoria';
}
interface ResultadoSimulado {
  audienciaHipotetica: number;
  entregasPotenciales: number;
  aperturasPotenciales: number;
  clicsPotenciales: number;
  tasaEntrega: number;
  tasaApertura: number;
  tasaClic: number;
}
interface CampanaDemo {
  id: string;
  fecha: string;
  ejecucionId: number;
  segmentoId: number;
  perfilesSimulados: number;
  tipo: TipoCampana;
  nombre: string;
  asunto: string;
  mensaje: string;
  estado: EstadoCampana;
  resultado?: ResultadoSimulado;
}

/** Borradores estrictamente locales. No utiliza direcciones, destinatarios ni Resend. */
const CLAVE_LOCAL = 'nayelis:campanas-ml-demostracion:v1';
const LIMITE_BORRADORES = 30;

export function recomendarCampana(segmento: Segmento): RecomendacionCampana {
  const dias = Number(segmento.dias_desde_ultima_compra_promedio ?? 0);
  const compras = Number(segmento.compras_promedio ?? 0);
  const gasto = Number(segmento.gasto_promedio_soles ?? 0);
  if (dias >= 120) {
    const alta = dias >= 180;
    return {
      segmento, tipo: 'REACTIVACION',
      nombre: alta ? 'Reactivación prioritaria' : 'Recuperación preventiva',
      motivo: `Recencia media de ${Math.round(dias)} días sin compra; conviene explorar una campaña de regreso.`,
      accion: 'Invitar a conocer las novedades del catálogo',
      prioridad: alta ? 'Alta' : 'Media'
    };
  }
  if (compras >= 8 && gasto >= 500) {
    return {
      segmento, tipo: 'FIDELIZACION', nombre: 'Fidelización',
      motivo: `Promedia ${compras.toFixed(1)} compras y S/ ${gasto.toFixed(2)} de gasto en datos simulados.`,
      accion: 'Presentar beneficios y novedades para compradores frecuentes',
      prioridad: 'Media'
    };
  }
  return {
    segmento, tipo: 'DESCUBRIMIENTO', nombre: 'Descubrimiento de productos',
    motivo: `El grupo presenta ${compras.toFixed(1)} compras promedio; puede explorarse una campaña de novedades.`,
    accion: 'Mostrar productos y conjuntos que se ajusten al catálogo',
    prioridad: 'Exploratoria'
  };
}

/** Los porcentajes son hipótesis editables, no resultados reales ni predicciones del modelo. */
export function simularCampana(audiencia: number, entrega: number, apertura: number, clic: number): ResultadoSimulado {
  const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
  const n = Math.max(0, Math.floor(Number.isFinite(audiencia) ? audiencia : 0));
  const e = clamp(entrega), a = clamp(apertura), c = clamp(clic);
  const entregasPotenciales = Math.round(n * e / 100);
  const aperturasPotenciales = Math.round(entregasPotenciales * a / 100);
  return {
    audienciaHipotetica: n,
    entregasPotenciales,
    aperturasPotenciales,
    clicsPotenciales: Math.round(aperturasPotenciales * c / 100),
    tasaEntrega: e, tasaApertura: a, tasaClic: c
  };
}

@Component({
  standalone: true,
  selector: 'app-campanas-demo',
  imports: [CommonModule, FormsModule],
  templateUrl: './campanas-demo.html'
})
export class CampanasDemoComponent implements OnInit {
  @Input() ejecucion?: EjecucionAcademica;

  segmentoSeleccionado = 0;
  tipo: TipoCampana = 'REACTIVACION';
  nombre = '';
  asunto = '';
  mensaje = '';
  entregaHipotetica = 95;
  aperturaHipotetica = 40;
  clicHipotetico = 20;
  mostrarEditor = false;
  mostrarPrevia = false;
  estadoMensaje = '';
  error = '';
  historial: CampanaDemo[] = [];

  readonly tipos: Array<{valor: TipoCampana; etiqueta: string}> = [
    {valor: 'REACTIVACION', etiqueta: 'Reactivación'},
    {valor: 'FIDELIZACION', etiqueta: 'Fidelización'},
    {valor: 'DESCUBRIMIENTO', etiqueta: 'Descubrimiento'}
  ];

  ngOnInit(): void { this.recuperarLocal(); }

  get habilitado(): boolean {
    return this.ejecucion?.modulo === 'CLUSTERING'
      && this.ejecucion.fuente === 'PRUEBA'
      && (this.ejecucion.resultado.segmentos?.length ?? 0) > 0;
  }

  get recomendaciones(): RecomendacionCampana[] {
    if (!this.habilitado) return [];
    return (this.ejecucion?.resultado.segmentos ?? []).map(recomendarCampana);
  }

  get seleccion(): RecomendacionCampana | undefined {
    return this.recomendaciones.find(x => x.segmento.segmento === Number(this.segmentoSeleccionado));
  }

  get vistaPrevia(): string {
    return [
      'Hola, [nombre de ejemplo]:',
      '',
      this.mensaje.trim(),
      '',
      'Conoce las novedades en nayelismoda.shop',
      '',
      'Nayeli\'s Moda',
      '',
      'VISTA PREVIA ACADÉMICA — no se envía ningún correo.',
      'En una campaña real se requerirían consentimiento y enlace de baja.'
    ].join('\n');
  }

  elegirSegmento(id: number): void {
    const sugerencia = this.recomendaciones.find(x => x.segmento.segmento === id);
    if (!sugerencia) return;
    this.segmentoSeleccionado = id;
    this.tipo = sugerencia.tipo;
    this.nombre = `${sugerencia.nombre} · Grupo ${id}`;
    this.actualizarPlantilla();
    this.mostrarEditor = true;
    this.mostrarPrevia = true;
    this.estadoMensaje = '';
    this.error = '';
  }

  elegirTipo(tipo: TipoCampana): void {
    this.tipo = tipo;
    this.actualizarPlantilla();
  }

  private actualizarPlantilla(): void {
    const textos: Record<TipoCampana, {asunto: string; mensaje: string}> = {
      REACTIVACION: {
        asunto: 'Te invitamos a descubrir las novedades de Nayeli\'s Moda',
        mensaje: 'Hace tiempo que no nos visitas. Descubre las últimas prendas y encuentra un nuevo look para ti. Te esperamos en nuestra tienda.'
      },
      FIDELIZACION: {
        asunto: 'Gracias por acompañarnos en Nayeli\'s Moda',
        mensaje: 'Valoramos que formes parte de nuestra comunidad. Conoce nuestras nuevas colecciones y encuentra prendas que complementen tu estilo.'
      },
      DESCUBRIMIENTO: {
        asunto: 'Inspírate con los nuevos looks de Nayeli\'s Moda',
        mensaje: 'Tenemos nuevas ideas de outfits para explorar. Visita el catálogo y combina prendas según tu estilo y presupuesto.'
      }
    };
    this.asunto = textos[this.tipo].asunto;
    this.mensaje = textos[this.tipo].mensaje;
  }

  guardarBorrador(): void { this.guardar('BORRADOR'); }

  simular(): void { this.guardar('SIMULADA'); }

  private guardar(estado: EstadoCampana): void {
    this.error = ''; this.estadoMensaje = '';
    const segmento = this.seleccion?.segmento;
    if (!this.habilitado || !segmento || !this.ejecucion) {
      this.error = 'Ejecuta K-Means con la fuente PRUEBA y selecciona un segmento.';
      return;
    }
    if (!this.nombre.trim() || !this.asunto.trim() || !this.mensaje.trim()) {
      this.error = 'Completa nombre, asunto y contenido del correo de demostración.';
      return;
    }
    const tasas = [this.entregaHipotetica, this.aperturaHipotetica, this.clicHipotetico];
    if (tasas.some(x => !Number.isFinite(Number(x)) || Number(x) < 0 || Number(x) > 100)) {
      this.error = 'Las tasas hipotéticas deben estar entre 0 y 100 %.';
      return;
    }
    const campana: CampanaDemo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fecha: new Date().toISOString(),
      ejecucionId: this.ejecucion.idEjecucion,
      segmentoId: segmento.segmento,
      perfilesSimulados: segmento.clientes,
      tipo: this.tipo,
      nombre: this.nombre.trim().slice(0, 100),
      asunto: this.asunto.trim().slice(0, 150),
      mensaje: this.mensaje.trim().slice(0, 1500),
      estado,
      ...(estado === 'SIMULADA' ? {
        resultado: simularCampana(
          segmento.clientes,
          Number(this.entregaHipotetica),
          Number(this.aperturaHipotetica),
          Number(this.clicHipotetico)
        )
      } : {})
    };
    this.historial = [campana, ...this.historial].slice(0, LIMITE_BORRADORES);
    this.persistirLocal();
    this.estadoMensaje = estado === 'SIMULADA'
      ? 'Simulación registrada en este navegador. No se enviaron correos ni se contactó a ningún usuario.'
      : 'Borrador de demostración guardado únicamente en este navegador.';
    this.mostrarPrevia = true;
  }

  editar(campana: CampanaDemo): void {
    this.segmentoSeleccionado = campana.segmentoId;
    this.tipo = campana.tipo;
    this.nombre = campana.nombre;
    this.asunto = campana.asunto;
    this.mensaje = campana.mensaje;
    this.entregaHipotetica = campana.resultado?.tasaEntrega ?? 95;
    this.aperturaHipotetica = campana.resultado?.tasaApertura ?? 40;
    this.clicHipotetico = campana.resultado?.tasaClic ?? 20;
    this.mostrarEditor = true;
    this.mostrarPrevia = true;
    this.estadoMensaje = 'Cargaste una copia editable de esta campaña; al guardar se creará un nuevo registro.';
    this.error = '';
  }

  eliminar(id: string): void {
    this.historial = this.historial.filter(x => x.id !== id);
    this.persistirLocal();
    this.estadoMensaje = 'Registro local eliminado.';
  }

  private recuperarLocal(): void {
    try {
      const raw = localStorage.getItem(CLAVE_LOCAL);
      if (!raw) return;
      const x: unknown = JSON.parse(raw);
      if (!Array.isArray(x)) return;
      this.historial = x.filter((item): item is CampanaDemo =>
        !!item && typeof item === 'object' && typeof item.id === 'string'
        && typeof item.nombre === 'string' && typeof item.segmentoId === 'number'
        && ['BORRADOR', 'SIMULADA'].includes(item.estado)
      ).slice(0, LIMITE_BORRADORES);
    } catch {
      this.historial = [];
    }
  }

  private persistirLocal(): void {
    try {
      localStorage.setItem(CLAVE_LOCAL, JSON.stringify(this.historial));
    } catch {
      this.estadoMensaje += ' El navegador no permitió guardar los registros localmente.';
    }
  }
}
