import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../../core/services/api.service';

/** Tipos usados por el panel de administración. */
export interface Pedido {
  idPedido: number;
  codigoPedido?: string;
  cliente: string;
  fechaPedido?: string;
  total: number;
  estado: string;
}

export interface ProductForm {
  idVariante: number | null;
  nombre: string;
  categoria: string;
  descripcion: string;
  marca: string;
  talla: string;
  color: string;
  colorHex: string;
  precio: number;
  precioBase: number;
  stock: number;
  stockMinimo: number;
  img: string;
}

export interface ProductVariantForm {
  talla: string;
  color: string;
  colorHex: string;
  precio: number;
  stock: number;
  stockMinimo: number;
}

export type NewProductForm = ProductForm & { variantes: ProductVariantForm[] };

/** Operaciones autenticadas de inventario y pedidos; el componente solo maneja formularios. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);

  listOrders(): Promise<Pedido[]> {
    return firstValueFrom(
      this.http.get<Pedido[]>(this.api.base + '/pedidos', { headers: this.api.headers() })
    );
  }

  createProduct(payload: NewProductForm): Promise<string> {
    return firstValueFrom(
      this.http.post(this.api.base + '/productos', payload, {
        headers: this.api.headers(), responseType: 'text'
      })
    );
  }

  updateProduct(id: number, payload: NewProductForm): Promise<string> {
    return firstValueFrom(
      this.http.put(this.api.base + '/productos/' + id, payload, {
        headers: this.api.headers(), responseType: 'text'
      })
    );
  }

  deleteProduct(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(this.api.base + '/productos/' + id, {
        headers: this.api.headers()
      })
    );
  }
}
