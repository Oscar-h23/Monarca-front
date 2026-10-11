import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/** Comodidad de navegación: Spring Boot sigue siendo responsable de autorizar. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  return session.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  return session.isAdmin() ? true : inject(Router).createUrlTree(['/login']);
};
