import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';
import { Complaint } from '../../models';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule],
  template: `
    <div class="page-container">
      <h2>Murojaatlar va arizalar</h2>
      <table mat-table [dataSource]="complaints" class="mat-elevation-z8">
        <ng-container matColumnDef="subject">
          <th mat-header-cell *matHeaderCellDef> Mavzu </th>
          <td mat-cell *matCellDef="let comp"> {{comp.subject}} </td>
        </ng-container>

        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef> Toifa </th>
          <td mat-cell *matCellDef="let comp">
            {{comp.category === 'ACADEMIC' ? 'Akademik' : (comp.category === 'FINANCIAL' ? 'Moliyaviy' : (comp.category === 'ADMINISTRATIVE' ? "Ma'muriy" : (comp.category === 'DISCRIMINATION' ? 'Kamsitish' : 'Boshqa')))}}
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef> Holati </th>
          <td mat-cell *matCellDef="let comp">
            <span class="status-chip" [ngClass]="comp.status.toLowerCase()">
              {{comp.status === 'DRAFT' ? 'Qoralama' : (comp.status === 'SUBMITTED' ? 'Yuborilgan' : comp.status)}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef> Sana </th>
          <td mat-cell *matCellDef="let comp"> {{comp.createdAt | date:'mediumDate'}} </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Amallar </th>
          <td mat-cell *matCellDef="let comp">
            <button *ngIf="comp.status === 'DRAFT'" mat-raised-button color="primary" (click)="confirm(comp.id)">Tasdiqlash</button>
          </td>
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
    .status-chip.draft { background: #fff3e0; color: #ef6c00; }
    .status-chip.submitted { background: #e8f5e9; color: #2e7d32; }
  `]
})
export class ComplaintsComponent implements OnInit {
  complaints: Complaint[] = [];
  displayedColumns = ['subject', 'category', 'status', 'date', 'actions'];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();
  }
  
  loadData() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getComplaints(orgId).subscribe(data => this.complaints = data);
    }
  }

  confirm(id: string) {
    this.apiService.confirmComplaint(id).subscribe(() => this.loadData());
  }
}
