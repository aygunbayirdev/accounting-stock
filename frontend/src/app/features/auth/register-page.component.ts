/**
 * Register Page
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

// Custom validator for password confirmation
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  selector: 'app-register-page',
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
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Muhasebe Sistemi</mat-card-title>
          <mat-card-subtitle>Yeni Hesap Oluştur</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="register-form">
            <mat-form-field appearance="outline">
              <mat-label>Ad</mat-label>
              <input 
                matInput 
                type="text" 
                formControlName="firstName"
                autocomplete="given-name"
                placeholder="Adınız">
              <mat-icon matPrefix>person</mat-icon>
              @if (form.controls.firstName.hasError('required')) {
                <mat-error>Ad gerekli</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Soyad</mat-label>
              <input 
                matInput 
                type="text" 
                formControlName="lastName"
                autocomplete="family-name"
                placeholder="Soyadınız">
              <mat-icon matPrefix>person</mat-icon>
              @if (form.controls.lastName.hasError('required')) {
                <mat-error>Soyad gerekli</mat-error>
              }
            </mat-form-field>

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
                autocomplete="new-password"
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

            <mat-form-field appearance="outline">
              <mat-label>Şifre Tekrar</mat-label>
              <input 
                matInput 
                [type]="hideConfirmPassword() ? 'password' : 'text'"
                formControlName="confirmPassword"
                autocomplete="new-password"
                placeholder="••••••••">
              <mat-icon matPrefix>lock</mat-icon>
              <button 
                mat-icon-button 
                matSuffix 
                type="button"
                (click)="hideConfirmPassword.set(!hideConfirmPassword())"
                [attr.aria-label]="'Şifreyi ' + (hideConfirmPassword() ? 'göster' : 'gizle')">
                <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.confirmPassword.hasError('required')) {
                <mat-error>Şifre tekrarı gerekli</mat-error>
              }
              @if (form.hasError('passwordMismatch') && form.controls.confirmPassword.touched) {
                <mat-error>Şifreler eşleşmiyor</mat-error>
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
                <span>Kayıt yapılıyor...</span>
              } @else {
                <span>Kayıt Ol</span>
              }
            </button>
          </form>

          <div class="login-link">
            Zaten hesabınız var mı? 
            <a routerLink="/login">Giriş Yap</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card {
      width: 100%;
      max-width: 450px;
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

    .register-form {
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

    .login-link {
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
export class RegisterPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    const { firstName, lastName, email, password } = this.form.value;

    this.authService.register({
      firstName: firstName!,
      lastName: lastName!,
      email: email!,
      password: password!
    }).subscribe({
      next: () => {
        this.snackBar.open('Kayıt başarılı! Giriş yapılıyor...', 'Kapat', { duration: 3000 });
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Register error:', error);
        this.snackBar.open('Kayıt başarısız. Lütfen tekrar deneyin.', 'Kapat', { duration: 5000 });
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
