import { Perfil } from '../services/perfil-api.service';
import { Producto, Variante } from '../models/shop.models';

export interface RecomendacionTalla {
  variante: Variante;
  medidasComparadas: string[];
  holguraPromedioCm: number;
}

function numero(n: number|null|undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

/**
 * Regla transparente, no IA: busca prendas cuyas circunferencias
 * superen los contornos corporales en al menos 2 cm.
 * No utiliza estatura porque el largo de una prenda no equivale a talla.
 * Si faltan medidas comparables, no inventa una recomendación.
 */
export function recomendarTalla(producto: Producto, perfil: Perfil): RecomendacionTalla|null {
  const disponibles = (producto.variantes || []).filter(v => v.stock > 0);
  const opciones: RecomendacionTalla[] = [];
  for (const v of disponibles) {
    const comparaciones: { nombre: string; cuerpo: number; prenda: number }[] = [];
    const datos: Array<[string, number|null|undefined, number|null|undefined]> = [
      ['pecho', perfil.bustoCm, v.pechoCm],
      ['cintura', perfil.cinturaCm, v.cinturaCm],
      ['cadera', perfil.caderaCm, v.caderaCm]
    ];
    for (const [nombre, cuerpo, prenda] of datos) {
      if (numero(cuerpo) && numero(prenda)) comparaciones.push({ nombre, cuerpo, prenda });
    }
    if (!comparaciones.length || comparaciones.some(x => x.prenda - x.cuerpo < 2)) continue;
    opciones.push({
      variante: v,
      medidasComparadas: comparaciones.map(x => x.nombre),
      holguraPromedioCm: comparaciones.reduce((s,x) => s + x.prenda-x.cuerpo,0)/comparaciones.length
    });
  }
  opciones.sort((a,b) =>
    b.medidasComparadas.length - a.medidasComparadas.length ||
    a.holguraPromedioCm - b.holguraPromedioCm ||
    a.variante.precio - b.variante.precio);
  return opciones[0] || null;
}

export function tieneMedidas(perfil: Perfil|null): boolean {
  return !!perfil && [perfil.bustoCm,perfil.cinturaCm,perfil.caderaCm].some(numero);
}
