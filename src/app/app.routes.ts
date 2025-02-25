import { Routes } from '@angular/router';
import { authGuard } from './guards/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./containers/login-page/login-page.component').then(
        (c) => c.LoginPageComponent
      ),
  },
  {
    path: '',
    loadComponent: async () =>
      import('./containers/dashboard-page/dashboard-page.component').then(
        (c) => c.DashboardPageComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
