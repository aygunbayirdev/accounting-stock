/**
 * Login Page
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Muhasebe Sistemi</mat-card-title>
          <mat-card-subtitle>Giriş Yap</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">
            <mat-form-field appearance="outline">
              <mat-label>E-posta</mat-label>
              <input 
                matInput 
                type="email" 
                formControlName="email"
                autocomplete="username"
                placeholder="ornek@email.com">
              <mat-icon matPrefix>email</mat-icon>
              @if (form.controls.email.hasError('required')) {
                <mat-error>E-posta gerekli</mat-error>
              }
              @if (form.controls.email.hasError('email')) {
                <mat-error>Geçerli bir e-posta girin</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Şifre</mat-label>
              <input 
                matInput 
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••">
              <mat-icon matPrefix>lock</mat-icon>
              <button 
                mat-icon-button 
                matSuffix 
                type="button"
                (click)="hidePassword.set(!hidePassword())"
                [attr.aria-label]="'Şifreyi ' + (hidePassword() ? 'göster' : 'gizle')">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.hasError('required')) {
                <mat-error>Şifre gerekli</mat-error>
              }
              @if (form.controls.password.hasError('minlength')) {
                <mat-error>Şifre en az 6 karakter olmalı</mat-error>
              }
            </mat-form-field>

            <button 
              mat-raised-button 
              color="primary" 
              type="submit"
              [disabled]="form.invalid || loading()"
              class="submit-btn">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Giriş yapılıyor...</span>
              } @else {
                <span>Giriş Yap</span>
              }
            </button>
          </form>

          <div class="register-link">
            Hesabınız yok mu? 
            <a routerLink="/register">Kayıt Ol</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    mat-card-title {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    mat-card-subtitle {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    mat-form-field {
      width: 100%;
    }

    .submit-btn {
      height: 48px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .register-link {
      margin-top: 16px;
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
      
      a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  hidePassword = signal(true);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    const { email, password } = this.form.value;

    this.authService.login({
      email: email!,
      password: password!
    }).subscribe({
      next: () => {
        this.snackBar.open('Giriş başarılı!', 'Kapat', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Login error:', error);
        this.snackBar.open('Giriş başarısız. E-posta veya şifre hatalı.', 'Kapat', { duration: 5000 });
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
