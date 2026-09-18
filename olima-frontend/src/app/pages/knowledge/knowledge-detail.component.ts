import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { KnowledgeBase, KnowledgeDocument } from '../../models';

@Component({
  selector: 'app-knowledge-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <div class="page-container">
      <div class="breadcrumb">
        <a routerLink="/knowledge">Bilimlar bazalari</a>
        <mat-icon class="crumb-sep">chevron_right</mat-icon>
        <span>{{ knowledgeBase?.name || '...' }}</span>
      </div>

      <div class="header">
        <div>
          <h1>{{ knowledgeBase?.name }}</h1>
          <p class="subtitle" *ngIf="knowledgeBase?.description">{{ knowledgeBase?.description }}</p>
        </div>
      </div>

      <div class="upload-card">
        <h3>Hujjat yuklash</h3>
        <p class="upload-hint">PDF, Word, TXT va boshqa matnli hujjatlar avtomatik tahlil qilinadi va chatbot qidiruvi uchun bo'laklarga ajratiladi.</p>

        <div class="upload-row">
          <input type="file" #fileInput (change)="onFileSelected($event)" [disabled]="uploading" />
          <mat-form-field appearance="outline" class="title-field">
            <mat-label>Hujjat sarlavhasi (ixtiyoriy)</mat-label>
            <input matInput [(ngModel)]="uploadTitle" [disabled]="uploading" placeholder="Standart: fayl nomi">
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="upload()" [disabled]="!selectedFile || uploading">
            <mat-icon>upload</mat-icon> Yuklash
          </button>
        </div>

        <mat-progress-bar *ngIf="uploading" mode="indeterminate"></mat-progress-bar>
        <p class="upload-error" *ngIf="uploadError">{{ uploadError }}</p>
      </div>

      <div class="upload-card">
        <h3>Veb-sahifadan ma'lumot olish</h3>
        <p class="upload-hint">Veb-sahifa URL manzilini kiriting, uning matni avtomatik yuklab olinadi va bilimlar bazasiga qo'shiladi.</p>

        <div class="upload-row">
          <mat-form-field appearance="outline" class="url-field">
            <mat-label>Veb-sahifa URL manzili</mat-label>
            <input matInput [(ngModel)]="urlToFetch" [disabled]="fetchingUrl" placeholder="https://lex.uz/docs/...">
          </mat-form-field>
          <mat-form-field appearance="outline" class="title-field">
            <mat-label>Hujjat sarlavhasi (ixtiyoriy)</mat-label>
            <input matInput [(ngModel)]="urlTitle" [disabled]="fetchingUrl" placeholder="Standart: URL manzili">
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="fetchFromUrl()" [disabled]="!urlToFetch || fetchingUrl">
            <mat-icon>public</mat-icon> Yuklab olish va qo'shish
          </button>
        </div>

        <mat-progress-bar *ngIf="fetchingUrl" mode="indeterminate"></mat-progress-bar>
        <p class="upload-error" *ngIf="urlError">{{ urlError }}</p>
      </div>

      <table mat-table [dataSource]="documents" class="mat-elevation-z8" *ngIf="documents.length > 0">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef> Hujjat </th>
          <td mat-cell *matCellDef="let doc">
            <div class="doc-info-cell">
              <strong>{{ doc.title }}</strong>
              <small class="doc-file" *ngIf="doc.fileName">{{ doc.fileName }} · {{ formatSize(doc.fileSize) }}</small>
              <small class="doc-file" *ngIf="!doc.fileName && doc.sourceUrl">
                <mat-icon inline="true" class="url-icon">public</mat-icon> {{ doc.sourceUrl }}
              </small>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef> Holati </th>
          <td mat-cell *matCellDef="let doc">
            <span class="badge" [ngClass]="doc.status.toLowerCase()"
                  [matTooltip]="doc.status === 'FAILED' ? doc.errorMessage : ''">
              {{ doc.status === 'READY' ? 'Tayyor' : (doc.status === 'PROCESSING' ? 'Qayta ishlanmoqda' : (doc.status === 'FAILED' ? 'Xatolik' : doc.status)) }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef> Yuklangan vaqti </th>
          <td mat-cell *matCellDef="let doc"> {{ doc.createdAt | date:'medium' }} </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div class="empty-state" *ngIf="documents.length === 0 && !loading">
        <mat-icon class="empty-icon">description</mat-icon>
        <h3>Hujjatlar mavjud emas</h3>
        <p>Ushbu bilimlar bazasini to'ldirish uchun yuqorida birinchi faylni yuklang yoki havola kiriting.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .breadcrumb a { color: #1a237e; text-decoration: none; font-weight: 500; }
    .breadcrumb a:hover { text-decoration: underline; }
    .crumb-sep { font-size: 16px; width: 16px; height: 16px; color: #94a3b8; }
    .header { margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; }

    .upload-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .upload-card h3 { margin: 0 0 4px 0; font-size: 15px; color: #1a237e; }
    .upload-hint { margin: 0 0 16px 0; font-size: 13px; color: #64748b; }
    .upload-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .title-field { flex: 1; min-width: 220px; margin-bottom: -1.25em; }
    .url-field { flex: 2; min-width: 260px; margin-bottom: -1.25em; }
    .upload-error { color: #dc2626; font-size: 13px; margin-top: 12px; margin-bottom: 0; }

    table { width: 100%; border-radius: 8px; overflow: hidden; }
    .doc-info-cell { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; }
    .doc-file { color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 4px; }
    .url-icon { font-size: 14px; width: 14px; height: 14px; }

    .badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge.completed { background: #ecfdf5; color: #059669; }
    .badge.processing, .badge.pending { background: #fef3c7; color: #d97706; }
    .badge.failed { background: #fef2f2; color: #dc2626; cursor: help; }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
      background: white;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      margin-top: 16px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #94a3b8; margin-bottom: 12px; }
  `]
})
export class KnowledgeDetailComponent implements OnInit {
  knowledgeBaseId = '';
  knowledgeBase?: KnowledgeBase;
  documents: KnowledgeDocument[] = [];
  displayedColumns: string[] = ['title', 'status', 'createdAt'];
  loading = false;

  selectedFile?: File;
  uploadTitle = '';
  uploading = false;
  uploadError = '';

  urlToFetch = '';
  urlTitle = '';
  fetchingUrl = false;
  urlError = '';

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/knowledge']);
        return;
      }
      this.knowledgeBaseId = id;
      this.loadKnowledgeBase();
      this.loadDocuments();
    });
  }

  loadKnowledgeBase() {
    this.apiService.getKnowledgeBase(this.knowledgeBaseId).subscribe({
      next: (kb) => this.knowledgeBase = kb,
      error: () => this.router.navigate(['/knowledge'])
    });
  }

  loadDocuments() {
    this.loading = true;
    this.apiService.getDocuments(this.knowledgeBaseId).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : undefined;
    this.uploadError = '';
  }

  upload() {
    if (!this.selectedFile) {
      return;
    }
    this.uploading = true;
    this.uploadError = '';

    this.apiService.uploadDocument(this.knowledgeBaseId, this.selectedFile, this.uploadTitle).subscribe({
      next: () => {
        this.uploading = false;
        this.selectedFile = undefined;
        this.uploadTitle = '';
        this.loadDocuments();
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err.error?.message || err.message || 'Hujjatni yuklashda xatolik yuz berdi';
      }
    });
  }

  fetchFromUrl() {
    if (!this.urlToFetch) {
      return;
    }
    this.fetchingUrl = true;
    this.urlError = '';

    this.apiService.uploadDocumentFromUrl(this.knowledgeBaseId, this.urlToFetch.trim(), this.urlTitle).subscribe({
      next: () => {
        this.fetchingUrl = false;
        this.urlToFetch = '';
        this.urlTitle = '';
        this.loadDocuments();
      },
      error: (err) => {
        this.fetchingUrl = false;
        this.urlError = err.error?.message || err.message || 'Veb-sahifani yuklab olishda xatolik yuz berdi';
      }
    });
  }

  formatSize(bytes?: number): string {
    if (!bytes) {
      return '';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
