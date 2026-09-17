import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Organization } from '../../models';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="page-container">
      <div class="breadcrumb">
        <a routerLink="/organizations">Organizations</a>
        <mat-icon class="crumb-sep">chevron_right</mat-icon>
        <a [routerLink]="['/organizations', orgId, 'tools']" *ngIf="orgId">Tools</a>
        <mat-icon class="crumb-sep" *ngIf="orgId">chevron_right</mat-icon>
        <span>{{ isNew ? 'Add Tool' : 'Edit Tool' }}</span>
      </div>

      <div class="header-section">
        <h2>{{ isNew ? 'Create New Tool' : 'Edit Tool: ' + (toolForm.get('name')?.value || '') }}</h2>
        <p class="subtitle">
          Define tools dynamically. The AI Agent will discover and execute this tool automatically without modifying any backend code.
        </p>
      </div>
      
      <form [formGroup]="toolForm" (ngSubmit)="save()">
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>General Information</mat-card-title>
          </mat-card-header>
          <mat-card-content class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Tool Name (snake_case)</mat-label>
              <input matInput formControlName="name" placeholder="e.g. get_student_attendance" required>
              <mat-hint>Must be unique within the organization (e.g. get_transfer_rules)</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tool Type</mat-label>
              <mat-select formControlName="type" required (selectionChange)="onTypeChange()">
                <mat-option value="REST_API">REST API</mat-option>
                <mat-option value="RAG">RAG (Knowledge Search)</mat-option>
                <mat-option value="DATABASE">DATABASE</mat-option>
                <mat-option value="WORKFLOW">WORKFLOW</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (Crucial for AI)</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                        placeholder="Detailed explanation of what this tool does and when the LLM should invoke it..." 
                        required></textarea>
              <mat-hint>The LLM decides to call this tool based entirely on this description.</mat-hint>
            </mat-form-field>

            <!-- REST API Specific Section -->
            <div *ngIf="toolForm.get('type')?.value === 'REST_API'" class="rest-config-section">
              <h4>REST API Settings</h4>
              <div class="rest-inputs">
                <mat-form-field appearance="outline" class="method-field">
                  <mat-label>HTTP Method</mat-label>
                  <mat-select [formControl]="httpMethodControl">
                    <mat-option value="GET">GET</mat-option>
                    <mat-option value="POST">POST</mat-option>
                    <mat-option value="PUT">PUT</mat-option>
                    <mat-option value="DELETE">DELETE</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="url-field">
                  <mat-label>Endpoint URL</mat-label>
                  <input matInput [formControl]="endpointUrlControl" 
                         placeholder="e.g. http://mock-government:8081/api/students/{studentId}">
                  <mat-hint>Path parameters like {{ '{' }}studentId{{ '}' }} will be automatically replaced with tool arguments.</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>JSON Configuration</mat-label>
              <textarea matInput formControlName="configuration" rows="5" required 
                        style="font-family: 'Consolas', monospace; font-size: 13px;"></textarea>
              <mat-hint>JSON payload configuration passed to the generic executor.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Access Level</mat-label>
              <mat-select formControlName="accessLevel" required>
                <mat-option value="READ">READ (Safe / Read-only)</mat-option>
                <mat-option value="WRITE">WRITE (Modifies Data)</mat-option>
                <mat-option value="SENSITIVE">SENSITIVE (High Security)</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="checkbox-group">
              <mat-checkbox formControlName="requiresConfirmation" color="warn">
                <strong>Requires Confirmation</strong> (Pauses execution until user confirms)
              </mat-checkbox>
              <mat-checkbox formControlName="enabled" color="primary">
                Enabled
              </mat-checkbox>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Parameters Section -->
        <mat-card class="form-section parameters-section">
          <mat-card-header>
            <mat-card-title>Tool Parameters (Schema for AI)</mat-card-title>
            <button type="button" mat-stroked-button color="primary" (click)="addParameter()">
              <mat-icon>add</mat-icon> Add Parameter
            </button>
          </mat-card-header>
          
          <mat-card-content formArrayName="parameters">
            <p class="param-help" *ngIf="parameters.length === 0">
              No parameters configured. Click "Add Parameter" if this tool requires inputs (e.g. studentId, query).
            </p>

            <div class="parameter-row" *ngFor="let param of parameters.controls; let i=index" [formGroupName]="i">
              <mat-form-field appearance="outline" class="param-name">
                <mat-label>Parameter Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. studentId" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="param-type">
                <mat-label>Type</mat-label>
                <mat-select formControlName="type" required>
                  <mat-option value="string">string</mat-option>
                  <mat-option value="number">number</mat-option>
                  <mat-option value="boolean">boolean</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="param-desc">
                <mat-label>Description for AI</mat-label>
                <input matInput formControlName="description" placeholder="e.g. The unique ID of the student" required>
              </mat-form-field>

              <mat-checkbox formControlName="required" class="param-req">Required</mat-checkbox>
              
              <button type="button" mat-icon-button color="warn" (click)="removeParameter(i)" title="Remove parameter">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="actions">
          <button type="button" mat-button (click)="goBack()">Cancel</button>
          <button type="submit" mat-raised-button color="primary" [disabled]="toolForm.invalid">
            <mat-icon>save</mat-icon> {{ isNew ? 'Create Tool' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 950px;
      margin: 0 auto;
      padding: 24px;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
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
    .header-section {
      margin-bottom: 24px;
    }
    .header-section h2 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 600;
      color: #1a237e;
    }
    .subtitle {
      margin: 6px 0 0 0;
      color: #64748b;
      font-size: 14px;
    }
    .form-section {
      margin-bottom: 24px;
      border-radius: 8px;
    }
    .form-section mat-card-header {
      margin-bottom: 16px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .rest-config-section {
      grid-column: 1 / -1;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .rest-config-section h4 {
      margin: 0 0 12px 0;
      color: #334155;
      font-size: 14px;
    }
    .rest-inputs {
      display: flex;
      gap: 16px;
    }
    .method-field {
      width: 140px;
    }
    .url-field {
      flex: 1;
    }
    .checkbox-group {
      display: flex;
      gap: 32px;
      align-items: center;
      grid-column: 1 / -1;
      padding: 8px 0;
    }
    .parameters-section mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .param-help {
      color: #94a3b8;
      font-size: 14px;
      padding: 12px 0;
    }
    .parameter-row {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .param-name {
      width: 180px;
    }
    .param-type {
      width: 120px;
    }
    .param-desc {
      flex: 1;
    }
    .param-req {
      margin: 0 8px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding-top: 12px;
    }
  `]
})
export class ToolDetailComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  toolForm: FormGroup;
  isNew = false;
  toolId = '';
  orgId = '';
  
  httpMethodControl = new FormControl('GET');
  endpointUrlControl = new FormControl('');

  private subscriptions: Subscription[] = [];
  private updatingConfigInternally = false;

  constructor() {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      description: ['', Validators.required],
      type: ['REST_API', Validators.required],
      configuration: ['{\n  "endpoint": "",\n  "method": "GET"\n}', Validators.required],
      requiresConfirmation: [false],
      accessLevel: ['READ', Validators.required],
      enabled: [true],
      parameters: this.fb.array([])
    });
  }

  ngOnInit() {
    this.toolId = this.route.snapshot.paramMap.get('id') || '';
    this.orgId = this.route.snapshot.queryParamMap.get('orgId') || localStorage.getItem('selectedOrgId') || '';

    if (this.toolId === 'new') {
      this.isNew = true;
    } else {
      this.isNew = false;
      this.loadTool(this.toolId);
    }
    
    // Sync REST controls to configuration JSON
    this.subscriptions.push(
      this.httpMethodControl.valueChanges.subscribe(() => this.updateRestConfig()),
      this.endpointUrlControl.valueChanges.subscribe(() => this.updateRestConfig())
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadTool(id: string) {
    this.apiService.getTool(id).subscribe({
      next: (tool) => {
        if (tool.organizationId) {
          this.orgId = tool.organizationId;
        }

        this.updatingConfigInternally = true;
        this.toolForm.patchValue({
          name: tool.name,
          description: tool.description,
          type: tool.type,
          configuration: tool.configuration,
          requiresConfirmation: tool.requiresConfirmation,
          accessLevel: tool.accessLevel,
          enabled: tool.enabled
        });

        this.parameters.clear();
        if (tool.parameters && tool.parameters.length > 0) {
          tool.parameters.forEach(p => {
            this.parameters.push(this.fb.group({
              name: [p.name, Validators.required],
              type: [p.type || 'string', Validators.required],
              description: [p.description || '', Validators.required],
              required: [p.required !== undefined ? p.required : true]
            }));
          });
        }

        // Parse REST API config if present
        if (tool.type === 'REST_API' && tool.configuration) {
          try {
            const cfg = typeof tool.configuration === 'string' ? JSON.parse(tool.configuration) : tool.configuration;
            if (cfg.method) {
              this.httpMethodControl.setValue(cfg.method, { emitEvent: false });
            }
            if (cfg.endpoint) {
              this.endpointUrlControl.setValue(cfg.endpoint, { emitEvent: false });
            } else if (cfg.url) {
              this.endpointUrlControl.setValue(cfg.url, { emitEvent: false });
            }
          } catch (e) {}
        }
        this.updatingConfigInternally = false;
      },
      error: (err) => {
        alert('Failed to load tool details: ' + (err.error?.message || err.message));
      }
    });
  }

  get parameters() {
    return this.toolForm.get('parameters') as FormArray;
  }

  addParameter() {
    this.parameters.push(this.fb.group({
      name: ['', Validators.required],
      type: ['string', Validators.required],
      description: ['', Validators.required],
      required: [true]
    }));
  }

  removeParameter(index: number) {
    this.parameters.removeAt(index);
  }

  onTypeChange() {
    const type = this.toolForm.get('type')?.value;
    if (type === 'REST_API') {
      this.updateRestConfig();
    } else if (type === 'RAG') {
      const defaultRagConfig = {
        knowledgeBaseId: "",
        maxResults: 3
      };
      this.toolForm.patchValue({
        configuration: JSON.stringify(defaultRagConfig, null, 2)
      });
    }
  }

  updateRestConfig() {
    if (this.updatingConfigInternally) return;
    if (this.toolForm.get('type')?.value === 'REST_API') {
      const config = {
        endpoint: this.endpointUrlControl.value || '',
        method: this.httpMethodControl.value || 'GET'
      };
      this.toolForm.patchValue({
        configuration: JSON.stringify(config, null, 2)
      });
    }
  }

  save() {
    if (this.toolForm.invalid) {
      this.toolForm.markAllAsTouched();
      return;
    }

    const formValue = this.toolForm.value;

    // Validate JSON format
    try {
      if (typeof formValue.configuration === 'string') {
        JSON.parse(formValue.configuration);
      }
    } catch (e) {
      alert('Invalid JSON in Configuration field. Please verify syntax.');
      return;
    }

    if (this.isNew) {
      const targetOrgId = this.orgId || localStorage.getItem('selectedOrgId');
      if (!targetOrgId) {
        alert('Please select an organization before creating a tool.');
        return;
      }

      this.apiService.createTool(targetOrgId, formValue).subscribe({
        next: () => {
          this.router.navigate(['/organizations', targetOrgId, 'tools']);
        },
        error: (err) => {
          alert('Failed to create tool: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.apiService.updateTool(this.toolId, formValue).subscribe({
        next: () => {
          if (this.orgId) {
            this.router.navigate(['/organizations', this.orgId, 'tools']);
          } else {
            this.goBack();
          }
        },
        error: (err) => {
          alert('Failed to update tool: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  goBack() {
    if (this.orgId) {
      this.router.navigate(['/organizations', this.orgId, 'tools']);
    } else {
      this.router.navigate(['/organizations']);
    }
  }
}
