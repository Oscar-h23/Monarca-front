import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cart } from '../../core/services/cart.service';
import { asset } from '../../core/utils/assets';

@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./cart.html'})
export class CartComponent{cart=inject(Cart);fallback=asset('mariposa.png')}
