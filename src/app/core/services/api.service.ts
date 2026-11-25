import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, MetodoPago, PedidoResponse, Producto } from '../models/shop.models';
import { SessionService } from './session.service';

/** Adaptador tipado a los endpoints de Spring Boot. Ninguna URL de backend en los componentes. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  readonly base = '/api';

  token(): string {
    return this.session.token();
  }

  headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.token() });
  }

  private catalogoCache: {datos:Producto[];vence:number}|null=null;
  private catalogoPendiente:Promise<Producto[]>|null=null;
  private catalogoVersion=0;
  invalidarCatalogo():void { this.catalogoVersion++;this.catalogoCache=null;this.catalogoPendiente=null; }
  productos(forzar=false): Promise<Producto[]> {
    if(forzar)this.invalidarCatalogo();
    if(this.catalogoCache && this.catalogoCache.vence>Date.now())return Promise.resolve(structuredClone(this.catalogoCache.datos));
    if(this.catalogoPendiente)return this.catalogoPendiente.then(datos=>structuredClone(datos));
    const version=this.catalogoVersion;
    const req=firstValueFrom(this.http.get<Producto[]>(this.base+'/productos')).then(datos=>{
      if(version===this.catalogoVersion)this.catalogoCache={datos:structuredClone(datos),vence:Date.now()+60000};
      return datos;
    }).finally(()=>{if(this.catalogoPendiente===req)this.catalogoPendiente=null;});
    this.catalogoPendiente=req;
    return req.then(datos=>structuredClone(datos));
  }

  producto(id: number): Promise<Producto> {
    return firstValueFrom(this.http.get<Producto>(this.base + '/productos/' + id));
  }

  recomendarTalla(idProducto:number): Promise<{disponible:boolean;idVariante?:number;talla?:string;holgurasCm?:Record<string,number>;metodo?:string;motivo?:string;experimental?:boolean;fuenteModelo?:string;aviso?:string}> {
    return firstValueFrom(this.http.get<{disponible:boolean;idVariante?:number;talla?:string;holgurasCm?:Record<string,number>;metodo?:string;motivo?:string;experimental?:boolean;fuenteModelo?:string;aviso?:string}>(
      this.base + '/perfil/tallas/' + idProducto, {headers:this.headers()}));
  }

  complementos(idProducto:number): Promise<{
    fuente:'REALES'|'PRUEBA';cestas:number;mensaje:string;
    recomendaciones:Array<{idProducto:number;nombre:string;precioDesde:number;soporte:number;confianza:number;lift:number}>;
  }> {
    return firstValueFrom(this.http.get<{
      fuente:'REALES'|'PRUEBA';cestas:number;mensaje:string;
      recomendaciones:Array<{idProducto:number;nombre:string;precioDesde:number;soporte:number;confianza:number;lift:number}>;
    }>(this.base+'/productos/'+idProducto+'/complementos'));
  }

  outfitsPresupuesto(presupuesto:number): Promise<{
    fuente:'CATALOGO';presupuestoSoles?:number;factibles:number;mensaje:string;
    aEstrella?:{combinacion:{id_variantes:number[];precio_soles:number;superior:string;inferior:string};puntuacion:number};
    hillClimbing?:{combinacion:{id_variantes:number[];precio_soles:number;superior:string;inferior:string};puntuacion:number};
  }> {
    return firstValueFrom(this.http.get<{
      fuente:'CATALOGO';presupuestoSoles?:number;factibles:number;mensaje:string;
      aEstrella?:{combinacion:{id_variantes:number[];precio_soles:number;superior:string;inferior:string};puntuacion:number};
      hillClimbing?:{combinacion:{id_variantes:number[];precio_soles:number;superior:string;inferior:string};puntuacion:number};
    }>(this.base+'/outfits/recomendar?presupuesto='+encodeURIComponent(String(presupuesto))));
  }

  metodos(): Promise<MetodoPago[]> {
    return firstValueFrom(this.http.get<MetodoPago[]>(this.base + '/metodos-pago', { headers: this.headers() }));
  }

  auth(path: string, body: unknown): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(this.base + '/auth/' + path, body));
  }

  pedido(body: unknown): Promise<PedidoResponse> {
    return firstValueFrom(this.http.post<PedidoResponse>(this.base + '/pedidos/procesar', body, { headers: this.headers() })).then(p=>{this.invalidarCatalogo();return p;});
  }
}
