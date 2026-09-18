import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { KnowledgeBase } from '../../models';
import { KnowledgeBaseDialogComponent } from './knowledge-base-dialog.component';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Knowledge Bases</h1>
          <p class="subtitle">Upload PDFs and other documents so the chatbot can answer from your own data</p>
        </div>
        <button mat-raised-button color="primary" (click)="addKnowledgeBase()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> New Knowledge Base
        </button>
      </div>

      <div class="kb-grid" *ngIf="knowledgeBases.length > 0">
        <mat-card *ngFor="let kb of knowledgeBases" class="kb-card" (click)="openKnowledgeBase(kb.id)">
          <mat-card-header>
            <mat-card-title>{{ kb.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ kb.description }}</p>
            <p class="date">Created: {{ kb.createdAt | date }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="knowledgeBases.length === 0">
        <mat-icon class="empty-icon">library_books</mat-icon>
        <h3>No knowledge bases yet</h3>
        <p *ngIf="orgId">Create one, then upload documents (PDF, DOCX, TXT, ...) for the chatbot to use.</p>
        <p *ngIf="!orgId">Please select an organization from the top menu first.</p>
        <button mat-raised-button color="primary" (click)="addKnowledgeBase()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> New Knowledge Base
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; }
    .kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .kb-card { cursor: pointer; transition: box-shadow 0.15s ease; }
    .kb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .date { font-size: 12px; color: #666; margin-top: 16px; }
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
export class KnowledgeComponent implements OnInit {
  knowledgeBases: KnowledgeBase[] = [];
  orgId: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.orgId = localStorage.getItem('selectedOrgId') || '';
    this.loadKnowledgeBases();
  }

  loadKnowledgeBases() {
    if (!this.orgId) {
      this.knowledgeBases = [];
      return;
    }
    this.apiService.getKnowledgeBases(this.orgId).subscribe(data => this.knowledgeBases = data);
  }

  addKnowledgeBase() {
    if (!this.orgId) {
      alert('Please select an organization first.');
      return;
    }

    const dialogRef = this.dialog.open(KnowledgeBaseDialogComponent, { width: '500px' });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createKnowledgeBase({ ...result, organizationId: this.orgId }).subscribe({
          next: (kb) => {
            this.loadKnowledgeBases();
            this.router.navigate(['/knowledge', kb.id]);
          },
          error: (err) => {
            alert('Failed to create knowledge base: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  openKnowledgeBase(id: string) {
    this.router.navigate(['/knowledge', id]);
  }
}
