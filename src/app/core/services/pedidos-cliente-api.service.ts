import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api } from './api.service';

export interface ProductoDePedido {
  idDetalle: number;
  nombreProducto: string;
  sku: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** El historial se obtiene del JWT; el frontend no envía ningún identificador de cliente. */
export interface MiPedido {
  idPedido: number;
  codigoPedido: string | null;
  estado: string;
  fechaPedido: string;
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  productos: ProductoDePedido[];
  estadoPago: string;
  codigoMetodoPago: string|null;
  evidenciaEnviada: boolean;
  motivoRechazo: string|null;
  boletaDisponible: boolean;
}

@Injectable({ providedIn: 'root' })
export class PedidosClienteApi {
  private http = inject(HttpClient);
  private api = inject(Api);

  subirEvidencia(idPedido: number, archivo: File): Promise<{estadoPago:string;mensaje:string}> {
    const body = new FormData();
    body.append('archivo', archivo, archivo.name);
    return firstValueFrom(this.http.post<{estadoPago:string;mensaje:string}>(
      this.api.base + '/pedidos/' + idPedido + '/evidencia', body,
      { headers: this.api.headers() }
    ));
  }

  descargarBoletaPrueba(idPedido: number): Promise<Blob> {
    return firstValueFrom(this.http.get(
      this.api.base + '/pedidos/' + idPedido + '/boleta-prueba',
      { headers: this.api.headers(), responseType: 'blob' }
    ));
  }

  listar(): Promise<MiPedido[]> {
    return firstValueFrom(this.http.get<MiPedido[]>(
      this.api.base + '/pedidos/mis-pedidos',
      { headers: this.api.headers() }
    ));
  }
}
