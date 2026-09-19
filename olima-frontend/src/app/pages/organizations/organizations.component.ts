import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Organization } from '../../models';
import { OrganizationDialogComponent } from './organization-dialog.component';
import { OrgAccessDialogComponent } from './org-access-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div class="page-head__text">
          <h1>Tashkilotlar</h1>
          <p>Har bir tashkilot — alohida mijoz: o'z bilim bazasi, o'z vositalari va o'z admini bilan.</p>
        </div>
        <div class="page-head__actions">
          <button mat-flat-button color="primary" (click)="addOrganization()">
            <mat-icon>add</mat-icon> Tashkilot qo'shish
          </button>
        </div>
      </div>

      <div class="table-wrap" *ngIf="organizations.length">
        <div class="table-scroll">
          <table mat-table [dataSource]="organizations">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nomi</th>
              <td mat-cell *matCellDef="let org">
                <div class="name">
                  <strong>{{ org.name }}</strong>
                  <small *ngIf="org.description">{{ org.description }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="slug">
              <th mat-header-cell *matHeaderCellDef>Qisqa nom</th>
              <td mat-cell *matCellDef="let org"><span class="mono">{{ org.slug }}</span></td>
            </ng-container>

            <ng-container matColumnDef="enabled">
              <th mat-header-cell *matHeaderCellDef>Holati</th>
              <td mat-cell *matCellDef="let org">
                <span class="tag" [class.tag--ok]="org.enabled">
                  {{ org.enabled ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Yaratilgan</th>
              <td mat-cell *matCellDef="let org" class="nowrap muted">
                {{ org.createdAt | date:'dd.MM.yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Amallar</th>
              <td mat-cell *matCellDef="let org">
                <div class="acts">
                  <button mat-flat-button color="primary" class="key-btn" (click)="openAccess(org)">
                    <mat-icon>vpn_key</mat-icon> Ulanish ma'lumotlari
                  </button>
                  <button mat-stroked-button (click)="viewTools(org.id)">
                    <mat-icon>handyman</mat-icon> Vositalar
                  </button>
                  <button mat-icon-button (click)="editOrganization(org)" matTooltip="Tahrirlash">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteOrganization(org)" matTooltip="O'chirish">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>

      <div class="empty" *ngIf="organizations.length === 0">
        <mat-icon>apartment</mat-icon>
        <h3>Hali tashkilot yo'q</h3>
        <p>Birinchi mijozni qo'shing — unga bilim bazasi, vositalar va admin hisobi biriktiriladi.</p>
        <button mat-flat-button color="primary" (click)="addOrganization()">
          <mat-icon>add</mat-icon> Tashkilot qo'shish
        </button>
      </div>
    </div>
  `,
  styles: [`
    .name { display: flex; flex-direction: column; gap: 3px; padding: 10px 0; min-width: 220px; }
    .name strong { font-size: 13.5px; font-weight: 650; color: var(--ink); }
    .name small {
      font-size: 12px; color: var(--ink-3); line-height: 17px;
      max-width: 42ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .acts { display: flex; align-items: center; gap: 7px; }
    .key-btn { white-space: nowrap; }
    .acts .mat-mdc-icon-button { flex-shrink: 0; }
  `]
})
export class OrganizationsComponent implements OnInit {
  organizations: Organization[] = [];
  displayedColumns: string[] = ['name', 'slug', 'enabled', 'createdAt', 'actions'];

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.apiService.getOrganizations().subscribe({
      next: (orgs) => (this.organizations = orgs),
      error: (err) => this.fail('Tashkilotlarni yuklab bo\'lmadi', err),
    });
  }

  /** Mijozga topshiriladigan hamma narsa bitta oynada: kirish hisobi, SDK qatori, fayl. */
  openAccess(org: Organization) {
    this.dialog.open(OrgAccessDialogComponent, {
      width: '680px',
      maxWidth: '94vw',
      data: { org },
    });
  }

  addOrganization() {
    this.dialog.open(OrganizationDialogComponent, { width: '520px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.apiService.createOrganization(result).subscribe({
          next: (newOrg) => {
            this.loadOrganizations();
            localStorage.setItem('selectedOrgId', newOrg.id);
            window.dispatchEvent(new Event('orgChanged'));
            this.snack.open(`"${newOrg.name}" qo'shildi`, 'OK', { duration: 3000 });
          },
          error: (err) => this.fail('Tashkilotni yaratib bo\'lmadi', err),
        });
      });
  }

  editOrganization(org: Organization) {
    this.dialog.open(OrganizationDialogComponent, { width: '520px', data: org })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.apiService.updateOrganization(org.id, result).subscribe({
          next: () => {
            this.loadOrganizations();
            window.dispatchEvent(new Event('orgChanged'));
          },
          error: (err) => this.fail('Tahrirlab bo\'lmadi', err),
        });
      });
  }

  deleteOrganization(org: Organization) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Tashkilotni o\'chirish',
        message: `"${org.name}" o'chiriladi — bilim bazasi, vositalar va suhbatlar bilan birga. Bu amalni ortga qaytarib bo'lmaydi.`,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.deleteOrganization(org.id).subscribe({
        next: () => {
          this.loadOrganizations();
          window.dispatchEvent(new Event('orgChanged'));
        },
        error: (err) => this.fail('O\'chirib bo\'lmadi', err),
      });
    });
  }

  viewTools(orgId: string) {
    localStorage.setItem('selectedOrgId', orgId);
    window.dispatchEvent(new Event('orgChanged'));
    this.router.navigate(['/organizations', orgId, 'tools']);
  }

  private fail(msg: string, err: any) {
    this.snack.open(`${msg}: ${err?.error?.message || err?.message || ''}`.trim(), 'OK', { duration: 5000 });
  }
}
