import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../../core/services/api.service';
import { MetodoPago } from '../../../core/models/shop.models';

/** Tipos usados por el panel de administración. */
export interface Pedido {
  idPedido: number;
  codigoPedido?: string;
  cliente: string;
  fechaPedido?: string;
  total: number;
  estado: string;
  estadoPago: string;
  metodoPago: string;
  evidenciaDisponible: boolean;
  motivoRechazo: string|null;
  boletaDisponible: boolean;
}

export interface AdministradorCuenta {
  idUsuario:number;
  correo:string;
  nombres:string;
  apellidos:string;
}

export interface EstadoCorreoAdmin {
  configurado: boolean;
  servidorSmtp: boolean;
  usuarioResend: boolean;
  claveSmtp: boolean;
  remitenteValido: boolean;
  servicioCorreo: boolean;
  mensaje: string;
  eventosPublicados: number;
  eventosConfirmados: number;
  mensajesAceptadosSmtp: number;
  mensajesFallidosSmtp: number;
  eventosOmitidos: number;
  eventosSinTransaccion: number;
}

export interface PeriodoVentas {
  desde: string;
  hasta: string;
  kpis: {
    ventasConfirmadas: number;
    pedidosConfirmados: number;
    pedidosRegistrados: number;
    pagosEnRevision: number;
    unidadesVendidas: number;
    ticketPromedio: number;
  };
  ventasDiarias: {fecha:string; importe:number; pedidos:number}[];
  mediosPago: {nombre:string; importe:number; pedidos:number}[];
  estados: {estado:string; cantidad:number}[];
  topProductos: {nombre:string; unidades:number; importe:number}[];
}

export type MetodoPagoEditable = MetodoPago & {activo:boolean};

export interface MetodoPagoDraft {
  activo:boolean;
  telefonoYape:string;
  qrUrl:string;
  titular:string;
  banco:string;
  numeroCuenta:string;
  cci:string;
}

export interface CostoProducto {idProducto:number; costoCompra:number|null;}

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
  costoCompra: number|null;
  stock: number;
  stockMinimo: number;
  pechoCm: number|null;
  cinturaCm: number|null;
  caderaCm: number|null;
  largoCm: number|null;
  img: string;
}

export interface ProductVariantForm {
  talla: string;
  color: string;
  colorHex: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  pechoCm: number|null;
  cinturaCm: number|null;
  caderaCm: number|null;
  largoCm: number|null;
}

export type NewProductForm = ProductForm & { variantes: ProductVariantForm[] };

/** Operaciones autenticadas de inventario y pedidos; el componente solo maneja formularios. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);

  listarAdministradores():Promise<AdministradorCuenta[]> {
    return firstValueFrom(this.http.get<AdministradorCuenta[]>(this.api.base+'/admin/usuarios/administradores',{headers:this.api.headers()}));
  }
  asignarAdministrador(correo:string):Promise<{mensaje:string}> {
    return firstValueFrom(this.http.put<{mensaje:string}>(this.api.base+'/admin/usuarios/administradores',{correo},{headers:this.api.headers()}));
  }

  estadoCorreo(): Promise<EstadoCorreoAdmin> {
    return firstValueFrom(this.http.get<EstadoCorreoAdmin>(
      this.api.base + '/admin/correo/estado', {headers:this.api.headers()}));
  }

  probarCorreo(): Promise<{mensaje:string}> {
    return firstValueFrom(this.http.post<{mensaje:string}>(
      this.api.base + '/admin/correo/prueba', {}, {headers:this.api.headers()}));
  }

  reportesVentas(desde:string, hasta:string):Promise<PeriodoVentas> {
    const params = new URLSearchParams({desde, hasta});
    return firstValueFrom(this.http.get<PeriodoVentas>(
      this.api.base + '/admin/reportes/ventas?' + params.toString(),
      {headers:this.api.headers()}));
  }

  listarMetodos():Promise<MetodoPagoEditable[]> {
    return firstValueFrom(this.http.get<MetodoPagoEditable[]>(
      this.api.base + '/admin/metodos-pago',{headers:this.api.headers()}));
  }

  guardarMetodo(id:number,datos:MetodoPagoDraft):Promise<MetodoPagoEditable> {
    return firstValueFrom(this.http.put<MetodoPagoEditable>(
      this.api.base + '/admin/metodos-pago/' + id,datos,{headers:this.api.headers()}));
  }

  listarCostos():Promise<CostoProducto[]> {
    return firstValueFrom(this.http.get<CostoProducto[]>(this.api.base+'/admin/productos/costos',{headers:this.api.headers()}));
  }

  listOrders(): Promise<Pedido[]> {
    return firstValueFrom(
      this.http.get<Pedido[]>(this.api.base + '/pedidos', { headers: this.api.headers() })
    );
  }

  evidenciaPago(idPedido: number): Promise<Blob> {
    return firstValueFrom(this.http.get(
      this.api.base + '/admin/pedidos/' + idPedido + '/evidencia',
      { headers: this.api.headers(), responseType: 'blob' }
    ));
  }

  revisarPago(idPedido: number, accion: 'APROBAR'|'RECHAZAR', motivo: string|null): Promise<{mensaje:string}> {
    return firstValueFrom(this.http.put<{mensaje:string}>(
      this.api.base + '/admin/pedidos/' + idPedido + '/pago',
      {accion,motivo}, { headers: this.api.headers() }
    ));
  }

  cambiarEstado(idPedido: number, estado: string): Promise<{mensaje:string}> {
    return firstValueFrom(this.http.put<{mensaje:string}>(
      this.api.base + '/admin/pedidos/' + idPedido + '/estado',
      {estado}, { headers: this.api.headers() }
    ));
  }

  boletaPrueba(idPedido: number): Promise<Blob> {
    return firstValueFrom(this.http.get(
      this.api.base + '/pedidos/' + idPedido + '/boleta-prueba',
      { headers: this.api.headers(), responseType: 'blob' }
    ));
  }

  uploadProductImage(file: File): Promise<{ url: string }> {
    const body = new FormData();
    body.append('archivo', file, file.name);
    // Content-Type multipart lo asigna el navegador (boundary); nunca fijarlo manualmente.
    return firstValueFrom(
      this.http.post<{url: string}>(this.api.base + '/productos/imagenes', body, {
        headers: this.api.headers()
      })
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
