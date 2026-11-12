import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MiPedido, PedidosClienteApi } from '../../core/services/pedidos-cliente-api.service';

type Filtro = 'pendientes' | 'anteriores';

/** Incluye estados futuros desconocidos en "pendientes" para no ocultar ningún pedido. */
const ESTADOS_TERMINADOS = new Set([
  'ENTREGADO', 'FINALIZADO', 'COMPLETADO', 'CANCELADO',
  'ANULADO', 'RECHAZADO', 'DEVUELTO', 'REEMBOLSADO'
]);
const ESTADOS_LEGIBLES: Record<string, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  PREPARANDO: 'En preparación',
  EN_CAMINO: 'En camino',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  FINALIZADO: 'Finalizado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
  ANULADO: 'Anulado',
  RECHAZADO: 'Rechazado',
  DEVUELTO: 'Devuelto',
  REEMBOLSADO: 'Reembolsado',
  PENDIENTE_CONFIRMACION: 'Pago por verificar'
};

@Component({
  standalone: true,
  selector: 'app-orders',
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.html'
})
export class OrdersPage implements OnInit {
  private api = inject(PedidosClienteApi);
  pedidos = signal<MiPedido[]>([]);
  cargando = signal(true);
  error = signal('');
  accionError = signal('');
  accionMensaje = signal('');
  enviandoId = signal<number|null>(null);
  descargandoId = signal<number|null>(null);
  archivos = new Map<number,File>();
  nombresArchivo = signal<Record<number,string>>({});
  filtro = signal<Filtro>('pendientes');

  pendientes = computed(() => this.pedidos().filter(p => !this.esAnterior(p.estado)));
  anteriores = computed(() => this.pedidos().filter(p => this.esAnterior(p.estado)));
  visibles = computed(() => this.filtro() === 'pendientes' ? this.pendientes() : this.anteriores());

  ngOnInit(): void { void this.cargar(); }

  puedeEnviarEvidencia(p: MiPedido): boolean {
    return !this.esAnterior(p.estado) && ['PENDIENTE','RECHAZADO']
      .includes((p.estadoPago || 'PENDIENTE').toUpperCase());
  }

  estadoDePago(estado: string): string {
    return ({
      PENDIENTE: 'Pago sin verificar',
      EN_REVISION: 'Evidencia en revisión',
      PAGADO: 'Pago confirmado',
      RECHAZADO: 'Evidencia rechazada',
      CANCELADO: 'Pago cancelado'
    } as Record<string,string>)[estado || 'PENDIENTE'] || estado.replace(/_/g,' ');
  }

  seleccionarArchivo(event: Event, id: number): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.accionError.set('');
    this.accionMensaje.set('');
    if (!['image/jpeg','image/png','image/webp'].includes(archivo.type) || archivo.size > 5_000_000) {
      this.accionError.set('Selecciona una foto JPG, PNG o WebP de máximo 5 MB.');
      input.value = '';
      return;
    }
    this.archivos.set(id, archivo);
    this.nombresArchivo.update(a => ({...a,[id]:archivo.name}));
  }

  async enviarEvidencia(pedido: MiPedido): Promise<void> {
    const archivo = this.archivos.get(pedido.idPedido);
    if (!archivo || this.enviandoId() !== null || !this.puedeEnviarEvidencia(pedido)) return;
    this.enviandoId.set(pedido.idPedido);
    this.accionError.set('');
    this.accionMensaje.set('');
    try {
      await this.api.subirEvidencia(pedido.idPedido, archivo);
      this.archivos.delete(pedido.idPedido);
      this.nombresArchivo.update(a => {
        const copia = {...a}; delete copia[pedido.idPedido]; return copia;
      });
      await this.cargar();
      this.accionMensaje.set('Evidencia enviada. El administrador revisará el abono antes de confirmarlo.');
    } catch (e) {
      this.accionError.set(this.mensajeError(e));
    } finally { this.enviandoId.set(null); }
  }

  async descargarBoleta(pedido: MiPedido): Promise<void> {
    if (!pedido.boletaDisponible || this.descargandoId() !== null) return;
    this.descargandoId.set(pedido.idPedido);
    this.accionError.set('');
    try {
      const blob = await this.api.descargarBoletaPrueba(pedido.idPedido);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boleta-prueba-' + (pedido.codigoPedido || pedido.idPedido) + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.accionError.set(this.mensajeError(e));
    } finally { this.descargandoId.set(null); }
  }

  private mensajeError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 409) return 'Esta operación no es válida para el estado actual del pedido. Actualiza los estados.';
      if (e.status === 401 || e.status === 403) return 'Tu sesión expiró o no tienes acceso a este pedido.';
      if (typeof e.error?.error === 'string') return e.error.error;
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    return e instanceof Error ? e.message : 'Ocurrió un error al procesar el pago.';
  }

  async cargar(): Promise<void> {
    if (this.cargando() && this.pedidos().length > 0) return;
    this.cargando.set(true);
    this.error.set('');
    try {
      this.pedidos.set(await this.api.listar());
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.error.set('Tu sesión expiró. Inicia sesión nuevamente para consultar tus pedidos.');
      } else {
        this.error.set('No pudimos cargar tus pedidos. Verifica la conexión con el servidor e inténtalo de nuevo.');
      }
    } finally {
      this.cargando.set(false);
    }
  }

  esAnterior(estado: string): boolean {
    return ESTADOS_TERMINADOS.has((estado || '').toUpperCase().trim());
  }

  estadoVisible(estado: string): string {
    const normalizado = (estado || 'PENDIENTE').toUpperCase().trim();
    return ESTADOS_LEGIBLES[normalizado] ||
      normalizado.toLowerCase().replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
  }
}
