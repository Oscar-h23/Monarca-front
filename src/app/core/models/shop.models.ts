/** Tipos del contrato REST de Monarca-back. */
export interface Variante {
  idVariante: number;
  sku: string;
  talla: string;
  color: string;
  colorHex?: string;
  precio: number;
  stock: number;
}
export interface Producto {
  idProducto: number;
  nombre: string;
  categoria: string;
  precioBase: number;
  imagen?: string;
  descripcion?: string;
  marca?: string;
  destacado?: boolean;
  variantes?: Variante[];
}
export interface Item {
  idProducto: number;
  idVariante: number;
  nombre: string;
  sku: string;
  talla: string;
  color: string;
  precio: number;
  cantidad: number;
  imagen: string;
  stockDisponible: number;
}
export interface MetodoPago {
  idMetodoPago: number;
  nombre: string;
}
export interface AuthResponse {
  token?: string;
  rol?: string;
  mensaje?: string;
}
export interface PedidoResponse {
  codigoPedido: string;
  total: number;
  estado: string;
}
