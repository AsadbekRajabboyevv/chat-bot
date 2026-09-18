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
        <a routerLink="/organizations">Tashkilotlar</a>
        <mat-icon class="crumb-sep">chevron_right</mat-icon>
        <a [routerLink]="['/organizations', orgId, 'tools']" *ngIf="orgId">Vositalar</a>
        <mat-icon class="crumb-sep" *ngIf="orgId">chevron_right</mat-icon>
        <span>{{ isNew ? "Vosita qo'shish" : "Vositani tahrirlash" }}</span>
      </div>

      <div class="header-section">
        <h2>{{ isNew ? 'Yangi vosita yaratish' : 'Vositani tahrirlash: ' + (toolForm.get('name')?.value || '') }}</h2>
        <p class="subtitle">
          Vositalarni dinamik shaklda sozlang. AI yordamchi ushbu vositani backend kodini o'zgartirmasdan avtomatik ravishda aniqlaydi va ishlatadi.
        </p>
      </div>
      
      <form [formGroup]="toolForm" (ngSubmit)="save()">
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Umumiy ma'lumotlar</mat-card-title>
          </mat-card-header>
          <mat-card-content class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Vosita nomi (snake_case)</mat-label>
              <input matInput formControlName="name" placeholder="masalan: get_student_attendance" required>
              <mat-hint>Tashkilot doirasida unikal bo'lishi lozim (masalan: get_transfer_rules)</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Vosita turi</mat-label>
              <mat-select formControlName="type" required (selectionChange)="onTypeChange()">
                <mat-option value="REST_API">REST API</mat-option>
                <mat-option value="RAG">RAG (Bilimlar bazasi qidiruvi)</mat-option>
                <mat-option value="DATABASE">DATABASE</mat-option>
                <mat-option value="WORKFLOW">WORKFLOW</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tavsif (AI uchun muhim)</mat-label>
              <textarea matInput formControlName="description" rows="3" 
                        placeholder="Vosita nima ish bajarishi va LLM uni qachon chaqirishi kerakligi haqida batafsil tavsif..." 
                        required></textarea>
              <mat-hint>AI ushbu tavsifga asoslanib mazkur vositani ishga tushirish qarorini qabul qiladi.</mat-hint>
            </mat-form-field>

            <!-- REST API Specific Section -->
            <div *ngIf="toolForm.get('type')?.value === 'REST_API'" class="rest-config-section">
              <h4>REST API sozlamalari</h4>
              <div class="rest-inputs">
                <mat-form-field appearance="outline" class="method-field">
                  <mat-label>HTTP metodi</mat-label>
                  <mat-select [formControl]="httpMethodControl">
                    <mat-option value="GET">GET</mat-option>
                    <mat-option value="POST">POST</mat-option>
                    <mat-option value="PUT">PUT</mat-option>
                    <mat-option value="DELETE">DELETE</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="url-field">
                  <mat-label>Endpoint URL manzili</mat-label>
                  <input matInput [formControl]="endpointUrlControl" 
                         placeholder="masalan: http://mock-government:8081/api/students/{studentId}">
                  <mat-hint>{{ '{' }}studentId{{ '}' }} kabi yo'l parametrlari avtomatik tarzda vosita argumentlari bilan almashtiriladi.</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>JSON konfiguratsiyasi</mat-label>
              <textarea matInput formControlName="configuration" rows="5" required 
                        style="font-family: 'Consolas', monospace; font-size: 13px;"></textarea>
              <mat-hint>Ijro mexanizmiga uzatiladigan JSON konfiguratsiyasi.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Ruxsat darajasi</mat-label>
              <mat-select formControlName="accessLevel" required>
                <mat-option value="READ">READ (Xavfsiz / Faqat o'qish)</mat-option>
                <mat-option value="WRITE">WRITE (Ma'lumotlarni o'zgartiradi)</mat-option>
                <mat-option value="SENSITIVE">SENSITIVE (Yuqori xavfsizlik talab etiladi)</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="checkbox-group">
              <mat-checkbox formControlName="requiresConfirmation" color="warn">
                <strong>Tasdiqlash talab etiladi</strong> (Foydalanuvchi tasdiqlamaguncha to'xtatib turiladi)
              </mat-checkbox>
              <mat-checkbox formControlName="enabled" color="primary">
                Faol
              </mat-checkbox>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Parameters Section -->
        <mat-card class="form-section parameters-section">
          <mat-card-header>
            <mat-card-title>Vosita parametrlari (AI uchun sxema)</mat-card-title>
            <button type="button" mat-stroked-button color="primary" (click)="addParameter()">
              <mat-icon>add</mat-icon> Parametr qo'shish
            </button>
          </mat-card-header>
          
          <mat-card-content formArrayName="parameters">
            <p class="param-help" *ngIf="parameters.length === 0">
              Parametrlar belgilanmagan. Agar vosita kiruvchi ma'lumotlarni talab qilsa (masalan: studentId, query), "Parametr qo'shish" tugmasini bosing.
            </p>

            <div class="parameter-row" *ngFor="let param of parameters.controls; let i=index" [formGroupName]="i">
              <mat-form-field appearance="outline" class="param-name">
                <mat-label>Parametr nomi</mat-label>
                <input matInput formControlName="name" placeholder="masalan: studentId" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="param-type">
                <mat-label>Turi</mat-label>
                <mat-select formControlName="type" required>
                  <mat-option value="string">string</mat-option>
                  <mat-option value="number">number</mat-option>
                  <mat-option value="boolean">boolean</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="param-desc">
                <mat-label>AI uchun tavsif</mat-label>
                <input matInput formControlName="description" placeholder="masalan: Talabaning unikal ID raqami" required>
              </mat-form-field>

              <mat-checkbox formControlName="required" class="param-req">Majburiy</mat-checkbox>
              
              <button type="button" mat-icon-button color="warn" (click)="removeParameter(i)" title="Parametrni o'chirish">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="actions">
          <button type="button" mat-button (click)="goBack()">Bekor qilish</button>
          <button type="submit" mat-raised-button color="primary" [disabled]="toolForm.invalid">
            <mat-icon>save</mat-icon> {{ isNew ? "Vosita yaratish" : "O'zgarishlarni saqlash" }}
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
      alert('Konfiguratsiya maydonidagi JSON noto\'g\'ri. Iltimos, sintaksisini tekshiring.');
      return;
    }

    if (this.isNew) {
      const targetOrgId = this.orgId || localStorage.getItem('selectedOrgId');
      if (!targetOrgId) {
        alert('Vosita yaratishdan oldin tashkilotni tanlang.');
        return;
      }

      this.apiService.createTool(targetOrgId, formValue).subscribe({
        next: () => {
          this.router.navigate(['/organizations', targetOrgId, 'tools']);
        },
        error: (err) => {
          alert('Vositani yaratishda xatolik: ' + (err.error?.message || err.message));
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
          alert('Vositani yangilashda xatolik: ' + (err.error?.message || err.message));
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
