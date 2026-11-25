import { Component, ElementRef, effect, inject, viewChild, DestroyRef } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  standalone:true,
  selector:'app-confirm-dialog',
  templateUrl:'./confirm-dialog.html'
})
export class ConfirmDialogComponent {
  readonly service=inject(ConfirmDialogService);
  private readonly dialog=viewChild<ElementRef<HTMLDialogElement>>('modal');
  private readonly router=inject(Router);
  private readonly destroy=inject(DestroyRef);

  constructor(){
    effect(()=>{
      const request=this.service.request();
      const el=this.dialog()?.nativeElement;
      if(!el)return;
      if(request&&!el.open){
        try{el.showModal();}catch{this.service.finish(false);}
      }else if(!request&&el.open){el.close();}
    });
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event=>{
      if(event instanceof NavigationStart)this.respond(false);
    });
    this.destroy.onDestroy(()=>this.service.finish(false));
  }

  respond(accepted:boolean):void{
    if(!this.service.request())return;
    const el=this.dialog()?.nativeElement;
    if(el?.open)el.close();
    this.service.finish(accepted);
  }

  cancel(event:Event):void{event.preventDefault();this.respond(false);}
}
