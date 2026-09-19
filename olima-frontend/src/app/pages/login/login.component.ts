import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="auth">
      <!-- chap: brend -->
      <section class="auth__brand">
        <div class="orb orb--a"></div>
        <div class="orb orb--b"></div>

        <div class="auth__brand-inner">
          <div class="mark">
            <img src="assets/logo.png" alt="OLIMA AI">
            <span>OLIMA AI</span>
          </div>

          <h2>Tashkilotingiz savollariga<br>o'z hujjatlaringiz asosida javob</h2>
          <p>Hujjatni yuklang, vositalarni ulang — bot javob bera boshlaydi.
             Har javob manbasi bilan, har tashkilot ma'lumoti alohida.</p>

          <ul class="facts">
            <li><mat-icon>bolt</mat-icon><span>Hujjatdan birinchi javobgacha — <b>29 soniya</b></span></li>
            <li><mat-icon>timer</mat-icon><span>Median javob vaqti — <b>3,0 soniya</b></span></li>
            <li><mat-icon>code</mat-icon><span>Saytga ulash — <b>bitta qator kod</b></span></li>
          </ul>
        </div>
      </section>

      <!-- o'ng: forma -->
      <section class="auth__form">
        <div class="box">
          <img src="assets/logo.png" alt="OLIMA AI" class="box__logo">
          <h1>Xush kelibsiz</h1>
          <p class="box__sub">Davom etish uchun hisobingizga kiring</p>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
            <label class="lbl" for="username">Login</label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input matInput id="username" formControlName="username"
                     autocomplete="username" placeholder="foydalanuvchi nomi">
              <mat-icon matPrefix>person_outline</mat-icon>
            </mat-form-field>

            <label class="lbl" for="password">Parol</label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <input matInput id="password" [type]="hide ? 'password' : 'text'"
                     formControlName="password" autocomplete="current-password" placeholder="••••••••">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hide = !hide"
                      [attr.aria-label]="hide ? 'Parolni ko\\'rsatish' : 'Parolni yashirish'">
                <mat-icon>{{ hide ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <div class="alert" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <button mat-flat-button color="primary" type="submit" class="submit"
                    [disabled]="loginForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="18" class="spin"></mat-spinner>
              <span *ngIf="!loading">Kirish</span>
            </button>
          </form>

          <p class="foot">Hisobingiz yo'qmi? Tashkilot administratoriga murojaat qiling.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .auth {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      background: var(--bg);
    }

    /* ---------- chap panel ---------- */
    .auth__brand {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 56px 60px;
      background: linear-gradient(145deg, #312e81 0%, #4338ca 46%, #6d28d9 100%);
      color: #fff;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(70px);
      opacity: .5;
      pointer-events: none;
    }
    .orb--a { width: 420px; height: 420px; background: #a855f7; top: -120px; right: -90px; }
    .orb--b { width: 360px; height: 360px; background: #38bdf8; bottom: -130px; left: -80px; opacity: .35; }

    .auth__brand-inner { position: relative; max-width: 480px; }

    .mark { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
    .mark img {
      width: 40px; height: 40px; border-radius: 11px; object-fit: contain;
      background: rgba(255,255,255,.12);
      padding: 4px;
    }
    .mark span { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }

    .auth__brand h2 {
      margin: 0 0 16px;
      font-size: 34px;
      line-height: 44px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .auth__brand p {
      margin: 0 0 40px;
      font-size: 15px;
      line-height: 25px;
      color: rgba(255,255,255,.76);
    }

    .facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 15px; }
    .facts li { display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(255,255,255,.88); }
    .facts mat-icon {
      font-size: 18px; width: 32px; height: 32px;
      display: grid; place-items: center;
      border-radius: 9px;
      background: rgba(255,255,255,.14);
      color: #fff;
      flex-shrink: 0;
    }
    .facts b { font-weight: 700; color: #fff; }

    /* ---------- o'ng panel ---------- */
    .auth__form { display: flex; align-items: center; justify-content: center; padding: 48px 32px; }

    .box { width: 100%; max-width: 372px; }

    .box__logo {
      width: 46px; height: 46px; border-radius: 13px; object-fit: contain;
      display: none;
      margin-bottom: 18px;
    }

    .box h1 {
      margin: 0 0 6px;
      font-size: 27px; line-height: 34px; font-weight: 700;
      letter-spacing: -0.025em; color: var(--ink);
    }
    .box__sub { margin: 0 0 30px; font-size: 14px; color: var(--ink-3); }

    .lbl {
      display: block;
      font-size: 12.5px; font-weight: 650; color: var(--ink-2);
      margin-bottom: 7px;
    }
    .box mat-form-field { width: 100%; margin-bottom: 18px; }
    .box mat-form-field mat-icon[matPrefix] {
      color: var(--ink-4); margin-right: 8px;
      font-size: 19px; width: 19px; height: 19px;
    }

    .alert {
      display: flex; align-items: center; gap: 9px;
      padding: 10px 13px; margin-bottom: 18px;
      background: var(--err-soft);
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #b91c1c; font-size: 13px; font-weight: 550;
    }
    .alert mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .submit {
      width: 100%; height: 46px;
      font-size: 14.5px !important;
      display: flex; align-items: center; justify-content: center;
    }
    .spin { margin: 0 auto; }
    ::ng-deep .submit .mat-mdc-progress-spinner circle { stroke: #fff; }

    .foot {
      margin: 26px 0 0;
      font-size: 12.5px; color: var(--ink-4); text-align: center; line-height: 19px;
    }

    @media (max-width: 900px) {
      .auth { grid-template-columns: 1fr; }
      .auth__brand { display: none; }
      .box__logo { display: block; }
      .auth__form { padding: 40px 20px; }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  hide = true;
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
