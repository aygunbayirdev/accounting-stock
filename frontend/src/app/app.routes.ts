import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes (guest only)
  { 
    path: 'login', 
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page.component').then(m => m.LoginPageComponent) 
  },
  { 
    path: 'register', 
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register-page.component').then(m => m.RegisterPageComponent) 
  },

  // Protected routes (authenticated users only)
  { path: '', pathMatch: 'full', redirectTo: 'invoices' },

  { 
    path: 'payments', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/payments-page.component').then(m => m.PaymentsPageComponent) 
  },
  { 
    path: 'items', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/items/items-page.component').then(m => m.ItemsPageComponent) 
  },
  { 
    path: 'fixed-assets', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/fixed-assets/fixed-assets-page.component').then(m => m.FixedAssetsPageComponent) 
  },

  // ---- Invoices (özeller önce) ----
  { 
    path: 'invoices/new', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage) 
  },
  { 
    path: 'invoices/:id/edit', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage) 
  },
  { 
    path: 'invoices/:id', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage) 
  },
  { 
    path: 'invoices', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoices-page.component').then(m => m.InvoicesPageComponent) 
  },

  // Redirect unknown routes
  { path: '**', redirectTo: 'login' }
];
