import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EntityPickerComponent, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import { ContactsService } from '../../core/services/contacts.service';
import { ChequeType, ChequeDirection, CreateChequeBody } from '../../core/models/cheque.models';

export interface ChequeFormDialogData {
  // Bu ekranda düzenleme yok — backend'de UpdateChequeCommand hiç yok, sadece
  // durum değişikliği (UpdateStatus) mevcut. Dialog her zaman "oluştur" modunda.
}

@Component({
  standalone: true,
  selector: 'app-cheque-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, EntityPickerComponent
  ],
  template: `
    <h2 mat-dialog-title>Yeni Çek/Senet</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Yön</mat-label>
            <mat-select formControlName="direction">
              <mat-option [value]="ChequeDirection.Inbound">Alınan (Müşteriden)</mat-option>
              <mat-option [value]="ChequeDirection.Outbound">Verilen (Tedarikçiye)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tür</mat-label>
            <mat-select formControlName="type">
              <mat-option [value]="ChequeType.Cheque">Çek</mat-option>
              <mat-option [value]="ChequeType.PromissoryNote">Senet</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <app-entity-picker
          [label]="form.value.direction === ChequeDirection.Inbound ? 'Cari (zorunlu)' : 'Cari (opsiyonel)'"
          [fetcher]="contactFetcher"
          [value]="form.value.contactId ?? null"
          [width]="'100%'"
          (valueChange)="onContactSelected($event)">
        </app-entity-picker>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Çek/Senet No</mat-label>
            <input matInput formControlName="chequeNumber" maxlength="50" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tutar</mat-label>
            <input matInput formControlName="amount" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Para Birimi</mat-label>
            <mat-select formControlName="currency">
              <mat-option value="TRY">TRY</mat-option>
              <mat-option value="USD">USD</mat-option>
              <mat-option value="EUR">EUR</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Düzenleme Tarihi</mat-label>
            <input matInput type="date" formControlName="issueDate" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Vade Tarihi</mat-label>
            <input matInput type="date" formControlName="dueDate" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Banka Adı</mat-label>
            <input matInput formControlName="bankName" maxlength="100" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Banka Şubesi</mat-label>
            <input matInput formControlName="bankBranch" maxlength="100" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Hesap No</mat-label>
            <input matInput formControlName="accountNumber" maxlength="50" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Keşideci</mat-label>
            <input matInput formControlName="drawerName" maxlength="200" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Açıklama</mat-label>
          <input matInput formControlName="description" maxlength="500" />
        </mat-form-field>

        <div class="form-error" *ngIf="formError">{{ formError }}</div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close(null)">Vazgeç</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">Kaydet</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .fields { display:flex; flex-direction:column; gap:10px; min-width:480px; padding-top:8px; }
    .row { display:flex; gap:10px; }
    .row mat-form-field { flex:1; min-width:0; }
    .form-error { color: var(--mat-sys-error, #b3261e); font-size: 0.85em; }
  `]
})
export class ChequeFormDialogComponent {
  dialogRef = inject(MatDialogRef<ChequeFormDialogComponent>);
  data = inject<ChequeFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private contactsService = inject(ContactsService);

  ChequeType = ChequeType;
  ChequeDirection = ChequeDirection;
  formError: string | null = null;

  form = this.fb.group({
    direction: [ChequeDirection.Inbound, Validators.required],
    type: [ChequeType.Cheque, Validators.required],
    contactId: [null as number | null],
    chequeNumber: ['', [Validators.required, Validators.maxLength(50)]],
    amount: ['', Validators.required],
    currency: ['TRY', Validators.required],
    issueDate: [this.todayInputValue(), Validators.required],
    dueDate: [this.todayInputValue(), Validators.required],
    bankName: [''],
    bankBranch: [''],
    accountNumber: [''],
    drawerName: [''],
    description: ['']
  });

  contactFetcher = (search: string): Observable<PickerOption[]> =>
    this.contactsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(c => ({ id: c.id, label: c.code, sublabel: c.name })))
    );

  onContactSelected(id: number | null) {
    this.form.patchValue({ contactId: id });
  }

  private todayInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  save() {
    this.formError = null;
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const direction = Number(v.direction) as ChequeDirection;

    if (direction === ChequeDirection.Inbound && !v.contactId) {
      this.formError = 'Alınan çek/senet için cari seçimi zorunludur.';
      return;
    }

    const amount = (v.amount ?? '').toString().replace(',', '.').trim();
    if (!amount || Number(amount) <= 0) {
      this.formError = 'Tutar 0’dan büyük olmalıdır.';
      return;
    }

    if (v.dueDate! < v.issueDate!) {
      this.formError = 'Vade tarihi düzenleme tarihinden önce olamaz.';
      return;
    }

    const body: CreateChequeBody = {
      contactId: v.contactId ?? null,
      type: Number(v.type) as ChequeType,
      direction,
      chequeNumber: v.chequeNumber!.trim(),
      issueDate: this.dateInputToUtcIso(v.issueDate!),
      dueDate: this.dateInputToUtcIso(v.dueDate!),
      amount,
      currency: v.currency!,
      bankName: v.bankName || null,
      bankBranch: v.bankBranch || null,
      accountNumber: v.accountNumber || null,
      drawerName: v.drawerName || null,
      description: v.description || null
    };

    this.dialogRef.close(body);
  }

  private dateInputToUtcIso(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00Z`).toISOString();
  }
}
