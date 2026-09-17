import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tool, Organization } from '../../models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <div class="breadcrumb">
            <a routerLink="/organizations">Organizations</a>
            <mat-icon class="crumb-sep">chevron_right</mat-icon>
            <span *ngIf="currentOrg">{{ currentOrg.name }}</span>
            <span *ngIf="!currentOrg">Tools</span>
          </div>
          <h1>Tools Management</h1>
          <p class="subtitle" *ngIf="currentOrg">
            Dynamic tools and capabilities registered for <strong>{{ currentOrg.name }}</strong>
          </p>
        </div>
        <button mat-raised-button color="primary" (click)="addTool()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> Add Tool
        </button>
      </div>
      
      <table mat-table [dataSource]="tools" class="mat-elevation-z8" *ngIf="tools.length > 0">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Tool Name & Description </th>
          <td mat-cell *matCellDef="let tool">
            <div class="tool-info-cell">
              <code>{{tool.name}}</code>
              <small class="tool-desc">{{tool.description}}</small>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef> Type </th>
          <td mat-cell *matCellDef="let tool">
            <span class="badge badge-type" [ngClass]="tool.type.toLowerCase()">
              {{tool.type}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="accessLevel">
          <th mat-header-cell *matHeaderCellDef> Access Level </th>
          <td mat-cell *matCellDef="let tool">
            <span class="badge badge-access" [ngClass]="tool.accessLevel.toLowerCase()">
              {{tool.accessLevel}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="requiresConfirmation">
          <th mat-header-cell *matHeaderCellDef> Confirmation </th>
          <td mat-cell *matCellDef="let tool">
            <span *ngIf="tool.requiresConfirmation" class="confirm-pill required" title="Requires human approval">
              <mat-icon>verified_user</mat-icon> Required
            </span>
            <span *ngIf="!tool.requiresConfirmation" class="confirm-pill auto" title="Executes automatically">
              Auto
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="enabled">
          <th mat-header-cell *matHeaderCellDef> Enabled </th>
          <td mat-cell *matCellDef="let tool">
            <mat-slide-toggle [checked]="tool.enabled" (change)="toggleTool(tool)"></mat-slide-toggle>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Actions </th>
          <td mat-cell *matCellDef="let tool">
            <div class="actions-wrapper">
              <button mat-icon-button color="primary" (click)="editTool(tool.id)" title="Edit tool">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteTool(tool)" title="Delete tool">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      <div class="empty-state" *ngIf="tools.length === 0 && !loading">
        <mat-icon class="empty-icon">build</mat-icon>
        <h3>No tools registered</h3>
        <p *ngIf="currentOrg">
          There are no tools registered for <strong>{{ currentOrg.name }}</strong> yet.
        </p>
        <p *ngIf="!currentOrg">
          Please select an organization from the top menu or the Organizations page.
        </p>
        <button mat-raised-button color="primary" (click)="addTool()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> Add First Tool
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .breadcrumb a {
      color: #1a237e;
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .crumb-sep {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #94a3b8;
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
    .tool-info-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 0;
      max-width: 400px;
    }
    .tool-info-cell code {
      font-family: monospace;
      font-weight: 600;
      color: #1a237e;
      font-size: 14px;
    }
    .tool-desc {
      color: #64748b;
      font-size: 12px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .badge-type.rest_api { background: #e0f2fe; color: #0284c7; }
    .badge-type.rag { background: #fef3c7; color: #d97706; }
    .badge-type.database { background: #ede9fe; color: #7c3aed; }
    .badge-type.workflow { background: #fce7f3; color: #db2777; }

    .badge-access.read { background: #ecfdf5; color: #059669; }
    .badge-access.write { background: #fffbeb; color: #b45309; }
    .badge-access.sensitive { background: #fef2f2; color: #dc2626; }

    .confirm-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .confirm-pill.required {
      background: #fef2f2;
      color: #b91c1c;
      font-weight: 600;
    }
    .confirm-pill.required mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .confirm-pill.auto {
      color: #64748b;
    }
    .actions-wrapper {
      display: flex;
      gap: 4px;
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      background: white;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      margin-top: 16px;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
  `]
})
export class ToolsComponent implements OnInit, OnDestroy {
  tools: Tool[] = [];
  orgId: string = '';
  currentOrg?: Organization;
  loading = false;
  displayedColumns: string[] = ['name', 'type', 'accessLevel', 'requiresConfirmation', 'enabled', 'actions'];

  private orgChangeListener = () => {
    const newOrgId = localStorage.getItem('selectedOrgId') || '';
    if (newOrgId && newOrgId !== this.orgId) {
      this.orgId = newOrgId;
      this.loadOrgAndTools();
    }
  };

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const paramOrgId = params.get('id');
      if (paramOrgId) {
        this.orgId = paramOrgId;
        localStorage.setItem('selectedOrgId', this.orgId);
        window.dispatchEvent(new Event('orgChanged'));
      } else {
        this.orgId = localStorage.getItem('selectedOrgId') || '';
      }
      this.loadOrgAndTools();
    });

    window.addEventListener('orgChanged', this.orgChangeListener);
  }

  ngOnDestroy() {
    window.removeEventListener('orgChanged', this.orgChangeListener);
  }

  loadOrgAndTools() {
    if (!this.orgId) {
      this.tools = [];
      return;
    }

    this.loading = true;
    this.apiService.getOrganization(this.orgId).subscribe({
      next: (org) => {
        this.currentOrg = org;
      },
      error: () => {}
    });

    this.apiService.getTools(this.orgId).subscribe({
      next: (tools) => {
        this.tools = tools;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  addTool() {
    if (!this.orgId) {
      alert('Please select an organization first.');
      return;
    }
    this.router.navigate(['/tools', 'new'], { queryParams: { orgId: this.orgId } });
  }

  editTool(id: string) {
    this.router.navigate(['/tools', id], { queryParams: { orgId: this.orgId } });
  }

  deleteTool(tool: Tool) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Tool',
        message: `Are you sure you want to delete tool "${tool.name}"? AI Agent will no longer be able to use it.`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.apiService.deleteTool(tool.id).subscribe({
          next: () => {
            this.loadOrgAndTools();
          },
          error: (err) => {
            alert('Failed to delete tool: ' + (err.error?.message || err.message));
          }
        });
      }
    });
  }

  toggleTool(tool: Tool) {
    const newStatus = !tool.enabled;
    this.apiService.toggleTool(tool.id, newStatus).subscribe({
      next: () => {
        tool.enabled = newStatus;
      },
      error: (err) => {
        tool.enabled = !newStatus; // revert switch
        alert('Failed to toggle tool status: ' + (err.error?.message || err.message));
      }
    });
  }
}
