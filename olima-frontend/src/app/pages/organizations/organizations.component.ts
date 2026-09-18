import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Organization } from '../../models';
import { OrganizationDialogComponent } from './organization-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
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
          <h1>Tashkilotlar</h1>
          <p class="subtitle">Tashkilotlar va ularning dinamik konfiguratsiyalarini boshqarish</p>
        </div>
        <button mat-raised-button color="primary" (click)="addOrganization()">
          <mat-icon>add</mat-icon> Tashkilot qo'shish
        </button>
      </div>
      
      <table mat-table [dataSource]="organizations" class="mat-elevation-z8">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nomi </th>
          <td mat-cell *matCellDef="let org">
            <div class="org-name-cell">
              <strong>{{org.name}}</strong>
              <small class="org-desc" *ngIf="org.description">{{org.description}}</small>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="slug">
          <th mat-header-cell *matHeaderCellDef> Qisqa nom (Slug) </th>
          <td mat-cell *matCellDef="let org">
            <code>{{org.slug}}</code>
          </td>
        </ng-container>

        <ng-container matColumnDef="enabled">
          <th mat-header-cell *matHeaderCellDef> Holati </th>
          <td mat-cell *matCellDef="let org"> 
            <span class="status-chip" [class.enabled]="org.enabled">
              {{org.enabled ? 'Faol' : 'Nofaol'}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef> Yaratilgan </th>
          <td mat-cell *matCellDef="let org"> {{org.createdAt | date:'mediumDate'}} </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Amallar </th>
          <td mat-cell *matCellDef="let org">
            <div class="action-buttons">
              <button mat-stroked-button color="primary" class="tools-btn" (click)="viewTools(org.id)">
                <mat-icon>build</mat-icon> Vositalar
              </button>
              <button mat-icon-button color="primary" (click)="editOrganization(org)" title="Tahrirlash">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteOrganization(org)" title="O'chirish">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div class="empty-state" *ngIf="organizations.length === 0">
        <mat-icon class="empty-icon">business</mat-icon>
        <h3>Hech qanday tashkilot topilmadi</h3>
        <p>Birinchi tashkilotni ro'yxatdan o'tkazish uchun yuqoridagi "Tashkilot qo'shish" tugmasini bosing.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: #1a237e;
    }
    .subtitle {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
    }
    .org-name-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
    }
    .org-desc {
      color: #666;
      font-size: 12px;
      max-width: 350px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #0f172a;
    }
    .status-chip {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #e0e0e0;
      color: #757575;
    }
    .status-chip.enabled {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tools-btn {
      font-size: 13px;
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: #777;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #9e9e9e;
      margin-bottom: 12px;
    }
  `]
})
export class OrganizationsComponent implements OnInit {
  organizations: Organization[] = [];
  displayedColumns: string[] = ['name', 'slug', 'enabled', 'createdAt', 'actions'];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.apiService.getOrganizations().subscribe(orgs => {
      this.organizations = orgs;
    });
  }

  addOrganization() {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.createOrganization(result).subscribe({
          next: (newOrg) => {
            this.loadOrganizations();
            localStorage.setItem('selectedOrgId', newOrg.id);
            window.dispatchEvent(new Event('orgChanged'));
          },
          error: (err) => {
            alert('Tashkilotni yaratishda xatolik: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  editOrganization(org: Organization) {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      width: '500px',
      data: org
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.updateOrganization(org.id, result).subscribe({
          next: () => {
            this.loadOrganizations();
            window.dispatchEvent(new Event('orgChanged'));
          },
          error: (err) => {
            alert('Tashkilotni tahrirlashda xatolik: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  deleteOrganization(org: Organization) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Tashkilotni o\'chirish',
        message: `"${org.name}" tashkilotini o'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo'lmaydi.`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteOrganization(org.id).subscribe({
          next: () => {
            this.loadOrganizations();
            window.dispatchEvent(new Event('orgChanged'));
          },
          error: (err) => {
            alert('Tashkilotni o\'chirishda xatolik: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  viewTools(orgId: string) {
    localStorage.setItem('selectedOrgId', orgId);
    window.dispatchEvent(new Event('orgChanged'));
    this.router.navigate(['/organizations', orgId, 'tools']);
  }
}
