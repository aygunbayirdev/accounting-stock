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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatIconModule, MatListModule, 
    MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  authService = inject(AuthService);
  
  opened = signal(true);
  
  // Computed values from auth service
  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  onLogout(): void {
    this.authService.logout();
  }
}
