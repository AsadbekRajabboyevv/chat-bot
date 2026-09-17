import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../services/api.service';
import { Execution } from '../../models';

@Component({
  selector: 'app-executions',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  template: `
    <div class="page-container">
      <h2>Execution Audit Log</h2>
      <table mat-table [dataSource]="executions" class="mat-elevation-z8">
        <ng-container matColumnDef="toolName">
          <th mat-header-cell *matHeaderCellDef> Tool Name </th>
          <td mat-cell *matCellDef="let exec"> {{exec.toolName}} </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef> Status </th>
          <td mat-cell *matCellDef="let exec">
            <span class="status-chip" [ngClass]="exec.status.toLowerCase()">{{exec.status}}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="duration">
          <th mat-header-cell *matHeaderCellDef> Duration (ms) </th>
          <td mat-cell *matCellDef="let exec"> {{exec.durationMs}} </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef> Date </th>
          <td mat-cell *matCellDef="let exec"> {{exec.createdAt | date:'short'}} </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    table { width: 100%; }
    .status-chip { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .status-chip.success { background: #e8f5e9; color: #2e7d32; }
    .status-chip.failed { background: #ffebee; color: #c62828; }
    .status-chip.pending { background: #fff3e0; color: #ef6c00; }
  `]
})
export class ExecutionsComponent implements OnInit {
  executions: Execution[] = [];
  displayedColumns = ['toolName', 'status', 'duration', 'date'];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getExecutions(orgId).subscribe(data => this.executions = data);
    }
  }
}
