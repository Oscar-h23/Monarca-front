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
  accionErrorPedidoId = signal<number|null>(null);
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
    // Permite volver a seleccionar el mismo archivo tras quitarlo o corregir un error.
    input.value = '';
    if (!archivo) return;

    this.accionError.set('');
    this.accionErrorPedidoId.set(null);
    this.accionMensaje.set('');

    if (!['image/jpeg','image/png','image/webp'].includes(archivo.type)
        || archivo.size === 0 || archivo.size > 5_000_000) {
      this.quitarArchivo(id);
      this.accionErrorPedidoId.set(id);
      this.accionError.set('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.');
      return;
    }
    this.archivos.set(id, archivo);
    this.nombresArchivo.update(prev => ({...prev, [id]: archivo.name}));
  }

  tamanoArchivo(id: number): string {
    const archivo = this.archivos.get(id);
    if (!archivo) return '';
    return archivo.size < 1_000_000
      ? (archivo.size / 1_000).toFixed(0) + ' KB'
      : (archivo.size / 1_000_000).toFixed(2) + ' MB';
  }

  quitarArchivo(id: number): void {
    this.archivos.delete(id);
    this.nombresArchivo.update(prev => {
      const siguiente = {...prev};
      delete siguiente[id];
      return siguiente;
    });
    if (this.accionErrorPedidoId() === id) {
      this.accionError.set('');
      this.accionErrorPedidoId.set(null);
    }
  }

  async enviarEvidencia(pedido: MiPedido): Promise<void> {
    const archivo = this.archivos.get(pedido.idPedido);
    if (!archivo || this.enviandoId() !== null || !this.puedeEnviarEvidencia(pedido)) return;
    this.enviandoId.set(pedido.idPedido);
    this.accionError.set('');
    this.accionErrorPedidoId.set(null);
    this.accionMensaje.set('');
    try {
      await this.api.subirEvidencia(pedido.idPedido, archivo);
      this.quitarArchivo(pedido.idPedido);
      await this.cargar();
      this.accionMensaje.set('Evidencia enviada. El administrador revisará el abono antes de confirmarlo.');
    } catch (e) {
      this.accionErrorPedidoId.set(pedido.idPedido);
      this.accionError.set(this.mensajeError(e));
    } finally { this.enviandoId.set(null); }
  }

  async descargarBoleta(pedido: MiPedido): Promise<void> {
    if (!pedido.boletaDisponible || this.descargandoId() !== null) return;
    this.descargandoId.set(pedido.idPedido);
    this.accionError.set('');
    this.accionErrorPedidoId.set(null);
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
      if (e.status === 503) {
        // El backend devuelve 503 si falta o se rechaza su credencial privada de Storage.
        // Evitar mostrar nombres de variables o detalles internos a los clientes.
        return 'No se pudo enviar el comprobante: el almacenamiento de pagos no está disponible o autorizado en el servidor. Inténtalo más tarde o contacta con la tienda.';
      }
      if (e.status === 413) return 'El archivo supera el tamaño máximo permitido de 5 MB.';
      if (e.status === 409) return 'El estado de este pedido cambió. Pulsa «Actualizar estados» e inténtalo de nuevo.';
      if (e.status === 401 || e.status === 403) return 'Tu sesión expiró o no tienes acceso a este pedido.';
      const error = e.error;
      const detalle = typeof error?.mensaje === 'string' ? error.mensaje
        : typeof error?.detail === 'string' ? error.detail
        : typeof error?.error === 'string' && !['Bad Request','Service Unavailable','Internal Server Error'].includes(error.error)
          ? error.error : '';
      if (detalle.trim()) return detalle;
      return 'No se pudo completar la operación. Comprueba el archivo e inténtalo de nuevo.';
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
