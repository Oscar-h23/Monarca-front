import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/access.guards';

/** Páginas standalone con carga diferida por funcionalidad. */
export const routes: Routes = [
  { path: '', title: 'Inicio | Monarca', loadComponent: () => import('./features/home/home.page').then(m => m.HomeComponent) },
  { path: 'catalogo/:categoria', title: 'Catálogo | Monarca', loadComponent: () => import('./features/catalog/catalog.page').then(m => m.CatalogComponent) },
  { path: 'producto/:id', title: 'Producto | Monarca', loadComponent: () => import('./features/product/product.page').then(m => m.ProductComponent) },
  { path: 'carrito', title: 'Mi bolsa | Monarca', loadComponent: () => import('./features/cart/cart.page').then(m => m.CartComponent) },
  { path: 'checkout', title: 'Finalizar compra | Monarca', canActivate: [authGuard], loadComponent: () => import('./features/checkout/checkout.page').then(m => m.CheckoutComponent) },
  { path: 'login', title: 'Mi cuenta | Monarca', loadComponent: () => import('./features/auth/auth.page').then(m => m.AuthPage) },
  { path: 'perfil', title: 'Mi perfil | Monarca', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
  { path: 'probador/:id', title: 'Probador virtual | Monarca', canActivate: [authGuard], loadComponent: () => import('./features/tryon/tryon.page').then(m => m.TryonPage) },
  { path: 'admin', title: 'Administración | Monarca', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.page').then(m => m.AdminPage) },
  { path: 'contacto', title: 'Contacto | Monarca', loadComponent: () => import('./features/contact/contact.page').then(m => m.ContactPage) },
  { path: 'nosotros', title: 'Nosotros | Monarca', loadComponent: () => import('./features/about/about.page').then(m => m.AboutPage) },
  { path: '**', redirectTo: '' }
];
