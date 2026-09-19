import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { TelegramBotConfig } from '../../models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-telegram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Telegram bot</h1>
          <p class="subtitle">Tashkilotingiz uchun Telegram botni ulang — u AI yordamchi bilan avtomatik ishlaydi, alohida sozlash shart emas</p>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <mat-card *ngIf="!loading && !orgId" class="empty-card">
        <p>Iltimos, avval yuqoridagi menyudan tashkilotni tanlang.</p>
      </mat-card>

      <mat-card *ngIf="!loading && orgId && config" class="status-card">
        <div class="status-header">
          <mat-icon class="connected-icon">check_circle</mat-icon>
          <div>
            <div class="bot-username">&#64;{{ config.botUsername }}</div>
            <div class="status-label">Ulangan</div>
          </div>
        </div>

        <div class="detail-row">
          <span class="detail-label">Token</span>
          <code>{{ config.maskedToken }}</code>
        </div>
        <div class="detail-row">
          <span class="detail-label">Webhook manzili</span>
          <code class="webhook-url">{{ config.webhookUrl }}</code>
        </div>

        <p class="hint">Botga <a [href]="'https://t.me/' + config.botUsername" target="_blank" rel="noopener noreferrer">shu havola</a> orqali yozing — u xuddi veb-chatdagidek javob beradi va kontekstni eslab qoladi.</p>

        <div class="actions">
          <button mat-stroked-button color="warn" (click)="disconnect()">
            <mat-icon>link_off</mat-icon> Botni uzish
          </button>
        </div>
      </mat-card>

      <mat-card *ngIf="!loading && orgId && !config" class="connect-card">
        <h3>Bot tokenini kiriting</h3>
        <p class="hint">
          Telegram'da <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">&#64;BotFather</a>ga yozib yangi bot yarating
          (<code>/newbot</code>), u sizga token beradi — shuni shu yerga joylashtiring.
        </p>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Bot token</mat-label>
          <input matInput [(ngModel)]="botToken" placeholder="123456789:AAExample-TokenHere" [disabled]="saving">
        </mat-form-field>

        <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>

        <button mat-raised-button color="primary" (click)="connect()" [disabled]="!botToken.trim() || saving">
          <mat-spinner *ngIf="saving" diameter="18" class="btn-spinner"></mat-spinner>
          <span *ngIf="!saving">Ulash</span>
        </button>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; }
    .loading-state { display: flex; justify-content: center; padding: 48px; }
    .empty-card, .connect-card, .status-card { padding: 24px; }

    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .connected-icon { color: #059669; font-size: 32px; width: 32px; height: 32px; }
    .bot-username { font-size: 18px; font-weight: 600; color: #1a237e; }
    .status-label { font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }
    .detail-label { font-size: 12px; color: #718096; font-weight: 600; text-transform: uppercase; }
    code {
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #0f172a;
      word-break: break-all;
    }
    .webhook-url { display: inline-block; }

    .hint { font-size: 13px; color: #64748b; margin: 12px 0; }
    .hint a { color: #1a237e; }

    .actions { margin-top: 16px; }

    .full-width { width: 100%; }
    .error-message { color: #dc2626; font-size: 13px; margin: -8px 0 12px 0; }
    .btn-spinner { margin: 0 auto; }
  `]
})
export class TelegramComponent implements OnInit {
  orgId = '';
  config: TelegramBotConfig | null = null;
  loading = false;
  saving = false;
  botToken = '';
  errorMessage = '';

  private orgChangeListener = () => {
    this.orgId = localStorage.getItem('selectedOrgId') || '';
    this.loadConfig();
  };

  constructor(private apiService: ApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.orgId = localStorage.getItem('selectedOrgId') || '';
    this.loadConfig();
    window.addEventListener('orgChanged', this.orgChangeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('orgChanged', this.orgChangeListener);
  }

  loadConfig(): void {
    if (!this.orgId) {
      this.config = null;
      return;
    }
    this.loading = true;
    this.apiService.getTelegramConfig(this.orgId).subscribe({
      next: (config) => {
        this.config = config;
        this.loading = false;
      },
      error: () => {
        this.config = null;
        this.loading = false;
      }
    });
  }

  connect(): void {
    if (!this.botToken.trim() || !this.orgId) {
      return;
    }
    this.saving = true;
    this.errorMessage = '';

    this.apiService.saveTelegramConfig(this.orgId, this.botToken.trim()).subscribe({
      next: (config) => {
        this.config = config;
        this.botToken = '';
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Botni ulashda xatolik yuz berdi';
      }
    });
  }

  disconnect(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Botni uzish',
        message: `@${this.config?.botUsername} botini uzishga ishonchingiz komilmi? Foydalanuvchilar bu bot orqali javob ololmay qoladi.`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteTelegramConfig(this.orgId).subscribe({
          next: () => this.config = null,
          error: (err) => alert('Uzishda xatolik: ' + (err.error?.message || err.message))
        });
      }
    });
  }
}
