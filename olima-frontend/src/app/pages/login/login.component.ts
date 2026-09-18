import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <div class="login-header">
          <mat-icon class="logo-icon">smart_toy</mat-icon>
          <h1>OLIMA</h1>
          <p>Boshqaruv paneliga kirish</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Login</mat-label>
            <input matInput formControlName="username" autocomplete="username" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Parol</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" required>
          </mat-form-field>

          <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>

          <button mat-raised-button color="primary" type="submit" class="full-width login-btn"
                  [disabled]="loginForm.invalid || loading">
            <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
            <span *ngIf="!loading">Kirish</span>
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
    }
    .login-card {
      width: 100%;
      max-width: 380px;
      padding: 32px;
      border-radius: 16px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1a237e;
    }
    .login-header h1 {
      margin: 8px 0 4px 0;
      color: #1a237e;
      font-weight: 600;
    }
    .login-header p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    .full-width {
      width: 100%;
    }
    .login-btn {
      height: 44px;
      margin-top: 8px;
    }
    .btn-spinner {
      margin: 0 auto;
    }
    .error-message {
      color: #dc2626;
      font-size: 13px;
      margin: -8px 0 12px 0;
      text-align: center;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login yoki parol noto\'g\'ri';
      }
    });
  }
}
