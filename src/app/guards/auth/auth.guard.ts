import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth) {
    throw new Error('AuthGuard requires AngularFire AuthModule');
  }
  const isAuth = auth.currentUser;
  if (!isAuth) {
    router.navigate(['/auth']);
    return false;
  }
  return true;
};
