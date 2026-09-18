import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../services/api.service';
import { Organization } from '../../models';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Yangi admin qo'shish</h2>
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Login</mat-label>
          <input matInput formControlName="username" placeholder="masalan: transport_admin" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Parol</mat-label>
          <input matInput type="password" formControlName="password" placeholder="kamida 4 belgi" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="role">
            <mat-option value="ORG_ADMIN">Tashkilot admini</mat-option>
            <mat-option value="SUPER_ADMIN">Super admin</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="userForm.get('role')?.value === 'ORG_ADMIN'">
          <mat-label>Tashkilot</mat-label>
          <mat-select formControlName="organizationId">
            <mat-option *ngFor="let org of organizations" [value]="org.id">{{ org.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="onCancel()">Bekor qilish</button>
        <button type="submit" mat-raised-button color="primary" [disabled]="userForm.invalid">
          Yaratish
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding-top: 12px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class UserDialogComponent implements OnInit {
  userForm: FormGroup;
  organizations: Organization[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    public dialogRef: MatDialogRef<UserDialogComponent>
  ) {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(4)]],
      role: ['ORG_ADMIN', Validators.required],
      organizationId: ['']
    });
  }

  ngOnInit(): void {
    this.apiService.getOrganizations().subscribe(orgs => this.organizations = orgs);

    this.userForm.get('role')?.valueChanges.subscribe(role => {
      const orgControl = this.userForm.get('organizationId');
      if (role === 'ORG_ADMIN') {
        orgControl?.setValidators(Validators.required);
      } else {
        orgControl?.clearValidators();
        orgControl?.setValue('');
      }
      orgControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const value = { ...this.userForm.value };
      if (value.role !== 'ORG_ADMIN') {
        delete value.organizationId;
      }
      this.dialogRef.close(value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
