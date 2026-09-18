import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Conversation } from '../../models';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h2>Suhbatlar tarixi</h2>
      <table mat-table [dataSource]="conversations" class="mat-elevation-z8">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef> Mavzu </th>
          <td mat-cell *matCellDef="let conv"> {{conv.title || 'Yangi suhbat'}} </td>
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
    </div>
  `,
  styles: [`.page-container { padding: 24px; } table { width: 100%; }`]
})
export class ConversationsComponent implements OnInit {
  conversations: Conversation[] = [];
  displayedColumns = ['title', 'date', 'messages', 'actions'];

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getConversations(orgId).subscribe(data => this.conversations = data);
    }
  }

  viewConversation(id: string) {
    this.router.navigate(['/conversations', id]);
  }
}
