import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ApiService } from '../../services/api.service';
import { AppUser } from '../../models';
import { UserDialogComponent } from './user-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [EmptyStateComponent, 
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Adminlar</h1>
          <p class="subtitle">Super adminlar va tashkilot adminlarining kirish hisoblarini boshqarish</p>
        </div>
        <button mat-raised-button color="primary" (click)="addUser()">
          <mat-icon>add</mat-icon> Yangi admin
        </button>
      </div>

      <table mat-table [dataSource]="users" class="mat-elevation-z8" *ngIf="users.length > 0">
        <ng-container matColumnDef="username">
          <th mat-header-cell *matHeaderCellDef> Login </th>
          <td mat-cell *matCellDef="let u"> <code>{{ u.username }}</code> </td>
        </ng-container>

        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef> Rol </th>
          <td mat-cell *matCellDef="let u">
            <span class="badge" [ngClass]="u.role.toLowerCase()">
              {{ u.role === 'SUPER_ADMIN' ? 'Super admin' : 'Tashkilot admini' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="organization">
          <th mat-header-cell *matHeaderCellDef> Tashkilot </th>
          <td mat-cell *matCellDef="let u"> {{ u.organizationName || '—' }} </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef> Yaratilgan </th>
          <td mat-cell *matCellDef="let u"> {{ u.createdAt | date:'mediumDate' }} </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Amallar </th>
          <td mat-cell *matCellDef="let u">
            <button mat-icon-button color="warn" (click)="deleteUser(u)" title="O'chirish">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <app-empty-state *ngIf="loaded && users.length === 0" icon="shield_person"
        title="Hali admin yo'q"
        text="Mijoz o'z bilimlar bazasi va murojaatlarini boshqarishi uchun unga tashkilot admini hisobini yarating.">
      </app-empty-state>
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
    table { width: 100%; border-radius: 8px; overflow: hidden; }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #0f172a;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge.super_admin { background: #ede9fe; color: #7c3aed; }
    .badge.org_admin { background: #e0f2fe; color: #0284c7; }
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
export class UsersComponent implements OnInit {
  users: AppUser[] = [];
  loaded = false;
  displayedColumns: string[] = ['username', 'role', 'organization', 'createdAt', 'actions'];

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.apiService.getUsers().subscribe({
      next: users => { this.users = users; this.loaded = true; },
      error: () => this.loaded = true,
    });
  }

  addUser(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, { width: '500px' });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createUser(result).subscribe({
          next: () => this.loadUsers(),
          error: (err) => alert('Admin yaratishda xatolik: ' + (err.error?.message || err.message))
        });
      }
    });
  }

  deleteUser(user: AppUser): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Adminni o\'chirish',
        message: `"${user.username}" hisobini o'chirishga ishonchingiz komilmi?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteUser(user.id).subscribe({
          next: () => this.loadUsers(),
          error: (err) => alert('O\'chirishda xatolik: ' + (err.error?.message || err.message))
        });
      }
    });
  }
}
