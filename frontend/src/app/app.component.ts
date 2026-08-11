import { Component, signal, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth.service';
import { PermissionService } from './core/services/permission.service';
import { HasPermissionDirective } from './shared/directives/has-permission.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatIconModule, MatListModule,
    MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule,
    HasPermissionDirective
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  authService = inject(AuthService);
  permissionService = inject(PermissionService);

  opened = signal(true);

  // Computed values from auth service
  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;
  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  // Sidenav grup açık/kapalı durumu — başlangıçta hepsi kapalı, tıklanınca açılır
  muhasebeOpen = signal(false);
  stokOpen = signal(false);
  sistemOpen = signal(false);

  // Bir grup, alt öğelerinin hiçbirine izin yoksa hiç gösterilmesin diye
  // ("Tanımlar"/"Raporlar" alt başlıkları da dahil) izinlere göre hesaplanan görünürlük
  muhasebeVisible = computed(() => this.permissionService.hasAny([
    'Payment.Read', 'Invoice.Read', 'Order.Read', 'CashBankAccount.Read', 'Cheque.Read',
    'Contact.Read', 'Branch.Read', 'Report.ContactStatement', 'Report.ProfitLoss'
  ]));
  muhasebeDefsVisible = computed(() => this.permissionService.hasAny(['Contact.Read', 'Branch.Read']));
  muhasebeReportsVisible = computed(() => this.permissionService.hasAny(['Report.ContactStatement', 'Report.ProfitLoss']));

  stokVisible = computed(() => this.permissionService.hasAny([
    'Stock.Read', 'StockMovement.Read', 'Item.Read', 'Warehouse.Read', 'Category.Read', 'Report.StockStatus'
  ]));
  stokDefsVisible = computed(() => this.permissionService.hasAny(['Item.Read', 'Warehouse.Read', 'Category.Read']));
  stokReportsVisible = computed(() => this.permissionService.hasAny(['Report.StockStatus']));

  sistemVisible = computed(() => this.permissionService.hasAny(['CompanySettings.Read']) || this.isAdmin());

  onLogout(): void {
    this.authService.logout();
  }
}
