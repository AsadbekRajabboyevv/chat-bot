import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Organization } from '../../models';

@Component({
  selector: 'app-organization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Organization' : 'Add Organization' }}</h2>
    <form [formGroup]="orgForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Organization Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Transport Ministry" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Brief description of the organization"></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="onCancel()">Cancel</button>
        <button type="submit" mat-raised-button color="primary" [disabled]="orgForm.invalid">
          {{ data ? 'Update' : 'Create' }}
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
export class OrganizationDialogComponent {
  orgForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<OrganizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: Organization
  ) {
    this.orgForm = this.fb.group({
      name: [data ? data.name : '', Validators.required],
      description: [data ? data.description : '']
    });
  }

  onSubmit(): void {
    if (this.orgForm.valid) {
      this.dialogRef.close(this.orgForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
