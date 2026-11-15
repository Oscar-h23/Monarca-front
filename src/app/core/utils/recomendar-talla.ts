import { Perfil } from '../services/perfil-api.service';
import { Producto, Variante } from '../models/shop.models';

export interface ComparacionMedida {
  nombre: string;
  cuerpoCm: number;
  prendaCm: number;
  holguraCm: number;
}
export interface RecomendacionTalla {
  variante: Variante;
  medidasComparadas: string[];
  holguraPromedioCm: number;
  detalle: ComparacionMedida[];
  tipo: 'REGLAS' | 'SUPERVISADO';
}

const REQUERIDAS:Record<string,Array<'pecho'|'cintura'|'cadera'>>={
  Tops:['pecho','cintura'],
  Bottoms:['cintura','cadera'],
  Vestidos:['pecho','cintura','cadera']
};
const MARGEN_MINIMO_CM=2;

function numero(n:number|null|undefined): n is number {
  return typeof n==='number' && Number.isFinite(n) && n>=25 && n<=300;
}

/**
 * Baseline determinista, NO modelo de ML entrenado.
 * Exige las medidas pertinentes completas y 2 cm de holgura en cada una.
 * Un tamaño de cuerpo y uno de prenda deben medirse como circunferencias
 * comparables. No se deducen medidas faltantes y no se utiliza la fotografía.
 */
export function recomendarTalla(producto:Producto,perfil:Perfil):RecomendacionTalla|null {
  const requeridas=REQUERIDAS[producto.categoria];
  if(!requeridas)return null;
  const cuerpo={pecho:perfil.bustoCm,cintura:perfil.cinturaCm,cadera:perfil.caderaCm};
  if(requeridas.some(k=>!numero(cuerpo[k])))return null;
  const opciones:RecomendacionTalla[]=[];
  for(const variante of producto.variantes||[]){
    if(variante.stock<=0)continue;
    const prenda={pecho:variante.pechoCm,cintura:variante.cinturaCm,cadera:variante.caderaCm};
    if(requeridas.some(k=>!numero(prenda[k])))continue;
    const detalle:ComparacionMedida[]=requeridas.map(k=>{
      const holguraCm=Number((prenda[k]!-cuerpo[k]!).toFixed(1));
      return {nombre:k,cuerpoCm:cuerpo[k]!,prendaCm:prenda[k]!,holguraCm};
    });
    if(detalle.some(d=>d.holguraCm<MARGEN_MINIMO_CM))continue;
    opciones.push({
      variante,medidasComparadas:[...requeridas],detalle,tipo:'REGLAS',
      holguraPromedioCm:detalle.reduce((s,d)=>s+d.holguraCm,0)/detalle.length
    });
  }
  opciones.sort((a,b)=>a.holguraPromedioCm-b.holguraPromedioCm ||
    a.variante.precio-b.variante.precio ||
    a.variante.idVariante-b.variante.idVariante);
  return opciones[0]||null;
}
export function tieneMedidas(perfil:Perfil|null, categoria?:string):boolean {
  if(!perfil)return false;
  const datos={pecho:perfil.bustoCm,cintura:perfil.cinturaCm,cadera:perfil.caderaCm};
  const dimensiones=categoria?REQUERIDAS[categoria]:undefined;
  return dimensiones
    ?dimensiones.every(k=>numero(datos[k]))
    :Object.values(datos).some(numero);
}
