import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  accept?: string;
  cancel?: string;
  danger?: boolean;
}
interface Confirmation {
  message: string;
  title: string;
  accept: string;
  cancel: string;
  danger: boolean;
}

@Injectable({providedIn:'root'})
export class ConfirmDialogService {
  private readonly current=signal<Confirmation|null>(null);
  readonly request=this.current.asReadonly();
  private resolvePending:((value:boolean)=>void)|null=null;

  confirm(message:string, options:ConfirmOptions={}):Promise<boolean>{
    // Never replace a pending confirmation or execute a duplicate action.
    if(this.resolvePending)return Promise.resolve(false);
    return new Promise<boolean>(resolve=>{
      this.resolvePending=resolve;
      this.current.set({
        message,title:options.title??'Confirmar acción',
        accept:options.accept??'Confirmar',cancel:options.cancel??'Cancelar',
        danger:options.danger??false
      });
    });
  }

  finish(accepted:boolean):void{
    const resolve=this.resolvePending;
    this.resolvePending=null;
    this.current.set(null);
    resolve?.(accepted);
  }
}
