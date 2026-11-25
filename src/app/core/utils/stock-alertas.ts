import { Producto, Variante } from '../models/shop.models';
export function minimo(v:Variante):number {
  return Number.isFinite(Number(v.stockMinimo))?Math.max(0,Number(v.stockMinimo)):0;
}
export function alertasStock(productos:Producto[]){
  return productos.flatMap(producto=>(producto.variantes??[]).filter(v=>v.stock<=minimo(v)).map(variante=>({
    producto,variante,agotar:variante.stock===0,minimo:minimo(variante),reponer:Math.max(0,minimo(variante)-variante.stock)
  }))).sort((a,b)=>Number(b.agotar)-Number(a.agotar)||b.reponer-a.reponer);
}
export function sugerirReposicion(p:Producto,demanda:number|undefined){
  if(!p.variantes?.length)return {estado:'Sin stock registrado',cantidad:null,alertas:0,minimo:0};
  const stock=p.variantes.reduce((s,v)=>s+Math.max(0,Number(v.stock)||0),0);
  const min=p.variantes.reduce((s,v)=>s+minimo(v),0);
  const alertas=alertasStock([p]).length;
  const faltanteMinimo=p.variantes.reduce((s,v)=>s+Math.max(0,minimo(v)-v.stock),0);
  const cantidad=Math.max(faltanteMinimo,demanda===undefined?0:Math.ceil(demanda)+min-stock);
  const estado=cantidad>0?'Reponer':stock===0?'Agotado':alertas>0?'Vigilar variantes':demanda===undefined?'Sin estimación ML':'Stock suficiente';
  return {estado,cantidad:demanda===undefined&&cantidad===0?null:cantidad,alertas,minimo:min};
}
