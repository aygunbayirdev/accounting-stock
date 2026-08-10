import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes (guest only)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page.component').then(m => m.LoginPageComponent)
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
    path: 'contacts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/contacts/contacts-page.component').then(m => m.ContactsPageComponent)
  },
  {
    path: 'branches',
    canActivate: [authGuard],
    loadComponent: () => import('./features/branches/branches-page.component').then(m => m.BranchesPageComponent)
  },
  {
    path: 'warehouses',
    canActivate: [authGuard],
    loadComponent: () => import('./features/warehouses/warehouses-page.component').then(m => m.WarehousesPageComponent)
  },
  {
    path: 'cash-bank-accounts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cash-bank-accounts/cash-bank-accounts-page.component').then(m => m.CashBankAccountsPageComponent)
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () => import('./features/categories/categories-page.component').then(m => m.CategoriesPageComponent)
  },
  {
    path: 'company-settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/company-settings/company-settings-page.component').then(m => m.CompanySettingsPageComponent)
  },
  {
    path: 'stocks',
    canActivate: [authGuard],
    loadComponent: () => import('./features/stocks/stocks-page.component').then(m => m.StocksPageComponent)
  },
  {
    path: 'stock-movements',
    canActivate: [authGuard],
    loadComponent: () => import('./features/stock-movements/stock-movements-page.component').then(m => m.StockMovementsPageComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/users/users-page.component').then(m => m.UsersPageComponent)
  },
  {
    path: 'roles',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/roles/roles-page.component').then(m => m.RolesPageComponent)
  },

  // ---- Invoices (özeller önce) ----
  // `data.mode`: InvoicesEditPage bu değeri okuyarak insert/edit/view arasında
  // seçim yapar — önceden URL'in '/edit' ile bitip bitmediğine bakılıyordu, route
  // adları değişirse kolayca kırılabilecek bir tespitti.
  {
    path: 'invoices/new',
    canActivate: [authGuard],
    data: { mode: 'insert' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  {
    path: 'invoices/:id/edit',
    canActivate: [authGuard],
    data: { mode: 'edit' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  {
    path: 'invoices/:id',
    canActivate: [authGuard],
    data: { mode: 'view' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  { 
    path: 'invoices', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoices-page.component').then(m => m.InvoicesPageComponent) 
  },

  // ---- Orders (özeller önce) ----
  {
    path: 'orders/new',
    canActivate: [authGuard],
    data: { mode: 'insert' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders/:id/edit',
    canActivate: [authGuard],
    data: { mode: 'edit' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    data: { mode: 'view' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/orders-page.component').then(m => m.OrdersPageComponent)
  },

  // Redirect unknown routes
  { path: '**', redirectTo: 'login' }
];
