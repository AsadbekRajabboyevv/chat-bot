import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from './services/api.service';
import { Organization } from './models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <mat-icon>smart_toy</mat-icon>
          <h2>OLIMA</h2>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <div matListItemTitle>Boshqaruv paneli</div>
          </a>
          <a mat-list-item routerLink="/chat" routerLinkActive="active">
            <mat-icon matListItemIcon>chat</mat-icon>
            <div matListItemTitle>Chat</div>
          </a>
          <a mat-list-item routerLink="/organizations" routerLinkActive="active">
            <mat-icon matListItemIcon>business</mat-icon>
            <div matListItemTitle>Tashkilotlar</div>
          </a>
          <a mat-list-item routerLink="/tools" routerLinkActive="active">
            <mat-icon matListItemIcon>build</mat-icon>
            <div matListItemTitle>Vositalar boshqaruvi</div>
          </a>
          <a mat-list-item routerLink="/conversations" routerLinkActive="active">
            <mat-icon matListItemIcon>forum</mat-icon>
            <div matListItemTitle>Suhbatlar</div>
          </a>
          <a mat-list-item routerLink="/executions" routerLinkActive="active">
            <mat-icon matListItemIcon>history</mat-icon>
            <div matListItemTitle>Bajarilgan amallar</div>
          </a>
          <a mat-list-item routerLink="/complaints" routerLinkActive="active">
            <mat-icon matListItemIcon>report_problem</mat-icon>
            <div matListItemTitle>Murojaatlar</div>
          </a>
          <a mat-list-item routerLink="/knowledge" routerLinkActive="active">
            <mat-icon matListItemIcon>library_books</mat-icon>
            <div matListItemTitle>Bilimlar bazasi</div>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span>OLIMA Boshqaruv Paneli</span>
          <span class="spacer"></span>
          
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="org-selector" *ngIf="organizations.length > 0">
            <mat-select [(ngModel)]="selectedOrgId" (selectionChange)="onOrgChange($event.value)" placeholder="Tashkilotni tanlang">
              <mat-option *ngFor="let org of organizations" [value]="org.id">
                {{ org.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </mat-toolbar>
        
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    .sidenav {
      width: 250px;
      background-color: #ffffff;
      box-shadow: 2px 0 5px rgba(0,0,0,0.05);
    }
    .sidenav-header {
      padding: 24px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: #1a237e;
      color: white;
    }
    .sidenav-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }
    .active {
      background-color: rgba(0, 0, 0, 0.04);
      color: #1a237e;
    }
    .active mat-icon {
      color: #1a237e;
    }
    .toolbar {
      background-color: #1a237e;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 2;
      position: relative;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .org-selector {
      width: 250px;
      margin-right: 16px;
    }
    ::ng-deep .org-selector .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    ::ng-deep .org-selector .mat-mdc-select-value-text {
      color: white !important;
    }
    ::ng-deep .org-selector .mat-mdc-select-arrow {
      color: white !important;
    }
    .content-wrapper {
      padding: 24px;
      height: calc(100vh - 64px - 48px);
      overflow-y: auto;
    }
  `]
})
export class AppComponent implements OnInit {
  organizations: Organization[] = [];
  selectedOrgId: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadOrganizations();

    window.addEventListener('orgChanged', () => {
      this.loadOrganizations(false);
    });
  }

  loadOrganizations(resetSelection = true): void {
    this.apiService.getOrganizations().subscribe(orgs => {
      this.organizations = orgs;
      const saved = localStorage.getItem('selectedOrgId');
      if (saved && orgs.some(o => o.id === saved)) {
        this.selectedOrgId = saved;
      } else if (orgs.length > 0 && resetSelection) {
        this.selectedOrgId = orgs[0].id;
        localStorage.setItem('selectedOrgId', this.selectedOrgId);
      }
    });
  }

  onOrgChange(orgId: string): void {
    this.selectedOrgId = orgId;
    localStorage.setItem('selectedOrgId', orgId);
    window.dispatchEvent(new Event('orgChanged'));
  }
}
