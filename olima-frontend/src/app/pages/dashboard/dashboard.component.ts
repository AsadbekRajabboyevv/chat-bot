import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <h1>Boshqaruv paneli</h1>

      <div class="stats-grid">
        <mat-card *ngIf="isSuperAdmin">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">business</mat-icon>
            <mat-card-title>Tashkilotlar</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ orgCount }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="!isSuperAdmin">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">business</mat-icon>
            <mat-card-title>Tashkilotingiz</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value org-name-value">{{ orgName || '—' }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">build</mat-icon>
            <mat-card-title>Vositalar</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ toolCount }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">forum</mat-icon>
            <mat-card-title>So'nggi suhbatlar</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ convCount }}</div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="actions-section">
        <h2>Tezkor amallar</h2>
        <div class="actions-grid">
          <button mat-raised-button color="primary" routerLink="/chat">
            <mat-icon>chat</mat-icon> Chatni boshlash
          </button>
          <button mat-raised-button color="accent" routerLink="/organizations" *ngIf="isSuperAdmin">
            <mat-icon>business</mat-icon> Tashkilotlarni boshqarish
          </button>
          <button mat-raised-button color="accent" routerLink="/knowledge" *ngIf="!isSuperAdmin">
            <mat-icon>library_books</mat-icon> Bilimlar bazasi
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    .stat-value {
      font-size: 3rem;
      font-weight: 300;
      text-align: center;
      padding: 16px 0;
    }
    .org-name-value {
      font-size: 1.5rem;
      font-weight: 500;
      color: #1a237e;
    }
    mat-icon[mat-card-avatar] {
      font-size: 40px;
      height: 40px;
      width: 40px;
    }
    .actions-section {
      margin-top: 32px;
    }
    .actions-grid {
      display: flex;
      gap: 16px;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  orgCount = 0;
  orgName = '';
  toolCount = 0;
  convCount = 0;

  private orgChangeListener = () => this.loadStats();

  constructor(private apiService: ApiService, private authService: AuthService) {}

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  ngOnInit() {
    this.loadStats();
    window.addEventListener('orgChanged', this.orgChangeListener);
  }

  ngOnDestroy() {
    window.removeEventListener('orgChanged', this.orgChangeListener);
  }

  loadStats() {
    this.apiService.getOrganizations().subscribe(orgs => {
      this.orgCount = orgs.length;

      const selectedOrgId = localStorage.getItem('selectedOrgId');
      const activeOrg = (selectedOrgId && orgs.find(o => o.id === selectedOrgId)) || orgs[0];
      this.orgName = activeOrg?.name || '';
      const activeOrgId = activeOrg?.id;

      if (activeOrgId) {
        this.apiService.getTools(activeOrgId).subscribe(tools => this.toolCount = tools.length);
        this.apiService.getConversations(activeOrgId).subscribe(convs => this.convCount = convs.length);
      } else {
        this.toolCount = 0;
        this.convCount = 0;
      }
    });
  }
}
