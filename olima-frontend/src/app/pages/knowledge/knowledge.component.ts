import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../services/api.service';
import { KnowledgeBase } from '../../models';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="page-container">
      <h2>Knowledge Bases</h2>
      <div class="kb-grid">
        <mat-card *ngFor="let kb of knowledgeBases">
          <mat-card-header>
            <mat-card-title>{{ kb.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ kb.description }}</p>
            <p class="date">Created: {{ kb.createdAt | date }}</p>
          </mat-card-content>
        </mat-card>
      </div>
      <div *ngIf="knowledgeBases.length === 0">
        <p>No knowledge bases found.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .date { font-size: 12px; color: #666; margin-top: 16px; }
  `]
})
export class KnowledgeComponent implements OnInit {
  knowledgeBases: KnowledgeBase[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getKnowledgeBases(orgId).subscribe(data => this.knowledgeBases = data);
    }
  }
}
