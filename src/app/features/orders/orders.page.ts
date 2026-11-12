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
  REEMBOLSADO: 'Reembolsado'
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
  filtro = signal<Filtro>('pendientes');

  pendientes = computed(() => this.pedidos().filter(p => !this.esAnterior(p.estado)));
  anteriores = computed(() => this.pedidos().filter(p => this.esAnterior(p.estado)));
  visibles = computed(() => this.filtro() === 'pendientes' ? this.pendientes() : this.anteriores());

  ngOnInit(): void { void this.cargar(); }

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
