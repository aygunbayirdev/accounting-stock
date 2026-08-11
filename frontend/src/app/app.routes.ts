import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  // Public routes (guest only)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page.component').then(m => m.LoginPageComponent)
  },

  // Protected routes (authenticated users only)
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  {
    path: 'dashboard',
    canActivate: [authGuard, permissionGuard('Report.Dashboard')],
    loadComponent: () => import('./features/dashboard/dashboard-page.component').then(m => m.DashboardPageComponent)
  },
  {
    path: 'reports/contact-statement',
    canActivate: [authGuard, permissionGuard('Report.ContactStatement')],
    loadComponent: () => import('./features/reports/contact-statement-page.component').then(m => m.ContactStatementPageComponent)
  },
  {
    path: 'reports/stock-status',
    canActivate: [authGuard, permissionGuard('Report.StockStatus')],
    loadComponent: () => import('./features/reports/stock-status-report-page.component').then(m => m.StockStatusReportPageComponent)
  },
  {
    path: 'reports/income-expense',
    canActivate: [authGuard, permissionGuard('Report.ProfitLoss')],
    loadComponent: () => import('./features/reports/income-expense-report-page.component').then(m => m.IncomeExpenseReportPageComponent)
  },
  {
    path: 'payments',
    canActivate: [authGuard, permissionGuard('Payment.Read')],
    loadComponent: () => import('./features/payments/payments-page.component').then(m => m.PaymentsPageComponent)
  },
  {
    path: 'items',
    canActivate: [authGuard, permissionGuard('Item.Read')],
    loadComponent: () => import('./features/items/items-page.component').then(m => m.ItemsPageComponent)
  },
  {
    path: 'contacts',
    canActivate: [authGuard, permissionGuard('Contact.Read')],
    loadComponent: () => import('./features/contacts/contacts-page.component').then(m => m.ContactsPageComponent)
  },
  {
    path: 'branches',
    canActivate: [authGuard, permissionGuard('Branch.Read')],
    loadComponent: () => import('./features/branches/branches-page.component').then(m => m.BranchesPageComponent)
  },
  {
    path: 'warehouses',
    canActivate: [authGuard, permissionGuard('Warehouse.Read')],
    loadComponent: () => import('./features/warehouses/warehouses-page.component').then(m => m.WarehousesPageComponent)
  },
  {
    path: 'cash-bank-accounts',
    canActivate: [authGuard, permissionGuard('CashBankAccount.Read')],
    loadComponent: () => import('./features/cash-bank-accounts/cash-bank-accounts-page.component').then(m => m.CashBankAccountsPageComponent)
  },
  {
    path: 'categories',
    canActivate: [authGuard, permissionGuard('Category.Read')],
    loadComponent: () => import('./features/categories/categories-page.component').then(m => m.CategoriesPageComponent)
  },
  {
    path: 'cheques',
    canActivate: [authGuard, permissionGuard('Cheque.Read')],
    loadComponent: () => import('./features/cheques/cheques-page.component').then(m => m.ChequesPageComponent)
  },
  {
    path: 'company-settings',
    canActivate: [authGuard, permissionGuard('CompanySettings.Read')],
    loadComponent: () => import('./features/company-settings/company-settings-page.component').then(m => m.CompanySettingsPageComponent)
  },
  {
    path: 'stocks',
    canActivate: [authGuard, permissionGuard('Stock.Read')],
    loadComponent: () => import('./features/stocks/stocks-page.component').then(m => m.StocksPageComponent)
  },
  {
    path: 'stock-movements',
    canActivate: [authGuard, permissionGuard('StockMovement.Read')],
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
    canActivate: [authGuard, permissionGuard('Invoice.Create')],
    data: { mode: 'insert' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  {
    path: 'invoices/:id/edit',
    canActivate: [authGuard, permissionGuard('Invoice.Update')],
    data: { mode: 'edit' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  {
    path: 'invoices/:id',
    canActivate: [authGuard, permissionGuard('Invoice.Read')],
    data: { mode: 'view' },
    loadComponent: () => import('./features/invoices/invoice-edit.page').then(m => m.InvoicesEditPage)
  },
  {
    path: 'invoices',
    canActivate: [authGuard, permissionGuard('Invoice.Read')],
    loadComponent: () => import('./features/invoices/invoices-page.component').then(m => m.InvoicesPageComponent)
  },

  // ---- Orders (özeller önce) ----
  {
    path: 'orders/new',
    canActivate: [authGuard, permissionGuard('Order.Create')],
    data: { mode: 'insert' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders/:id/edit',
    canActivate: [authGuard, permissionGuard('Order.Update')],
    data: { mode: 'edit' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard, permissionGuard('Order.Read')],
    data: { mode: 'view' },
    loadComponent: () => import('./features/orders/order-edit.page').then(m => m.OrderEditPage)
  },
  {
    path: 'orders',
    canActivate: [authGuard, permissionGuard('Order.Read')],
    loadComponent: () => import('./features/orders/orders-page.component').then(m => m.OrdersPageComponent)
  },

  // Redirect unknown routes
  { path: '**', redirectTo: 'login' }
];
