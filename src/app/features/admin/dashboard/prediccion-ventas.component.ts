import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../../core/models/shop.models';
import { AdminApi } from '../data-access/admin-api.service';

@Component({
  selector: 'app-prediccion-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prediccion-ventas.html'
})
export class PrediccionVentasComponent {
  @Input() products: Producto[] = [];
  private api = inject(AdminApi);
  buscar = '';
  producto: Producto | null = null;
  precio = 0;
  descuento = 0;
  visitas = 100;
  ocupado = false;
  error = '';
  resultados = new Map<number, number>();
  get filtrados(): Producto[] {
    const q = this.buscar.trim().toLowerCase();
    return this.products.filter(p => (p.nombre + ' ' + p.categoria).toLowerCase().includes(q));
  }
  stock(p: Producto): number | null {
    return p.variantes?.length ? p.variantes.reduce((s,v) => s + Math.max(0, Number(v.stock)||0),0) : null;
  }
  elegir(p: Producto): void {
    this.producto = p; this.precio = p.precioBase; this.descuento = 0; this.visitas = 100; this.error = '';
  }
  get estimado(): number | undefined { return this.producto ? this.resultados.get(this.producto.idProducto) : undefined; }
  get restante(): number | null {
    const s = this.producto ? this.stock(this.producto) : null;
    return s === null || this.estimado === undefined ? null : s - Math.ceil(this.estimado);
  }
  invalidar(): void { if(this.producto) this.resultados.delete(this.producto.idProducto); this.error = ''; }
  async calcular(): Promise<void> {
    if(this.ocupado || !this.producto) return;
    this.invalidar();
    const id = this.producto.idProducto;
    if(!Number.isFinite(this.precio)||this.precio<0.01||this.precio>10000||!Number.isFinite(this.descuento)||this.descuento<0||this.descuento>100||!Number.isInteger(this.visitas)||this.visitas<0||this.visitas>100000) {
      this.error='Revisa el precio, descuento (0–100 %) y visitas semanales (0–100000).'; return;
    }
    this.ocupado=true;
    try {
      const r = await this.api.simularDemandaProducto({idProducto:id,precioSoles:this.precio,descuentoPorcentaje:this.descuento,visitasSemana:this.visitas});
      if(r.resultado.idProducto!==id || !Number.isFinite(r.resultado.unidadesEscenario)||r.resultado.unidadesEscenario<0) throw new Error('Resultado inválido');
      this.resultados.set(id,r.resultado.unidadesEscenario);
    } catch { this.error='No se pudo estimar este producto. Comprueba que la fuente DEMANDA sea PRUEBA, que el dataset incluya el producto y que el servicio ML esté disponible.'; }
    finally { this.ocupado=false; }
  }
}
