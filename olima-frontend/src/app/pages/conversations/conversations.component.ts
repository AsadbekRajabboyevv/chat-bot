import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ApiService } from '../../services/api.service';
import { Conversation } from '../../models';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [EmptyStateComponent, CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h2>Suhbatlar tarixi</h2>
      <table mat-table [dataSource]="conversations" class="mat-elevation-z8" *ngIf="conversations.length > 0">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef> Mavzu </th>
          <td mat-cell *matCellDef="let conv"> {{ title(conv.title) }} </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef> Sana </th>
          <td mat-cell *matCellDef="let conv"> {{conv.createdAt | date:'short'}} </td>
        </ng-container>

        <ng-container matColumnDef="messages">
          <th mat-header-cell *matHeaderCellDef> Xabarlar soni </th>
          <td mat-cell *matCellDef="let conv"> {{conv.messages?.length || 0}} </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Amallar </th>
          <td mat-cell *matCellDef="let conv">
            <button mat-icon-button color="primary" (click)="viewConversation(conv.id)" title="Ko'rish">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <app-empty-state *ngIf="loaded && conversations.length === 0" icon="forum"
        title="Hali suhbat yo'q"
        text="Saytingizdagi widget orqali birinchi savol berilishi bilan suhbat shu yerda paydo bo'ladi — savol, javob va manbalari bilan.">
        <button mat-flat-button color="primary" (click)="router.navigate(['/chat'])">
          <mat-icon>chat</mat-icon> Chatni sinab ko'rish
        </button>
      </app-empty-state>
    </div>
  `,
  styles: [`.page-container { padding: 24px; } table { width: 100%; }`]
})
export class ConversationsComponent implements OnInit {
  conversations: Conversation[] = [];
  displayedColumns = ['title', 'date', 'messages', 'actions'];
  loaded = false;

  constructor(private apiService: ApiService, readonly router: Router) {}

  ngOnInit() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (!orgId) { this.loaded = true; return; }
    this.apiService.getConversations(orgId).subscribe({
      next: data => { this.conversations = data; this.loaded = true; },
      error: () => this.loaded = true,
    });
  }

  /** Backend avtomatik sarlavhani inglizcha yozadi ("Chat with X") — ko'rsatishda o'zbekchalashtiriladi. */
  title(t?: string | null): string {
    const v = t?.trim();
    if (!v) return 'Yangi suhbat';
    return v.startsWith('Chat with ') ? 'Suhbat: ' + v.slice('Chat with '.length) : v;
  }

  viewConversation(id: string) {
    this.router.navigate(['/conversations', id]);
  }
}
