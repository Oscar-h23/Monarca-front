import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Cart } from '../core/services/cart.service';
import { SessionService } from '../core/services/session.service';
import { asset } from '../core/utils/assets';

const categories = ['Tops', 'Bottoms', 'Calzado', 'Accesorios'];

@Component({standalone:true,selector:'app-root',imports:[CommonModule,RouterOutlet,RouterLink],templateUrl:'./shell.component.html'})
export class AppComponent{
 cart=inject(Cart);router=inject(Router);session=inject(SessionService);categories=categories;menu=signal(false);logo=asset('logo-desktop.png');
 loggedIn(){return this.session.isAuthenticated()}
 isAdmin(){return this.session.isAdmin()}
 logout(){this.session.clear();this.router.navigateByUrl('/')}
}
