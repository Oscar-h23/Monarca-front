import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/access.guards';

/** Páginas standalone con carga diferida por funcionalidad. */
export const routes: Routes = [
  { path: '', title: 'Inicio | Nayeli’s moda', loadComponent: () => import('./features/home/home.page').then(m => m.HomeComponent) },
  { path: 'catalogo/:categoria', title: 'Catálogo | Nayeli’s moda', loadComponent: () => import('./features/catalog/catalog.page').then(m => m.CatalogComponent) },
  { path: 'producto/:id', title: 'Producto | Nayeli’s moda', loadComponent: () => import('./features/product/product.page').then(m => m.ProductComponent) },
  { path: 'carrito', title: 'Mi bolsa | Nayeli’s moda', loadComponent: () => import('./features/cart/cart.page').then(m => m.CartComponent) },
  { path: 'checkout', title: 'Finalizar compra | Nayeli’s moda', canActivate: [authGuard], loadComponent: () => import('./features/checkout/checkout.page').then(m => m.CheckoutComponent) },
  { path: 'login', title: 'Mi cuenta | Nayeli’s moda', loadComponent: () => import('./features/auth/auth.page').then(m => m.AuthPage) },
  { path: 'perfil', title: 'Mi perfil | Nayeli’s moda', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'probador/:id', title: 'Probador virtual | Nayeli’s moda', canActivate: [authGuard], loadComponent: () => import('./features/tryon/tryon.page').then(m => m.TryonPage) },
  { path: 'admin', title: 'Administración | Nayeli’s moda', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.page').then(m => m.AdminPage) },
  { path: 'contacto', title: 'Contacto | Nayeli’s moda', loadComponent: () => import('./features/contact/contact.page').then(m => m.ContactPage) },
  { path: 'nosotros', title: 'Nosotros | Nayeli’s moda', loadComponent: () => import('./features/about/about.page').then(m => m.AboutPage) },
  { path: '**', redirectTo: '' }
];
