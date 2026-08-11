import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BranchesService } from '../../core/services/branches.service';
import { BranchListItemDto } from '../../core/models/branch.models';
import { ContactDto } from '../../core/models/contact.models';

export interface ContactFormDialogData {
  contact: ContactDto | null; // null => oluştur
  defaultBranchId: number | null;
}

type ContactKind = 'company' | 'person';

@Component({
  standalone: true,
  selector: 'app-contact-form-dialog',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatButtonModule, MatButtonToggleModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.contact ? 'Cariyi Düzenle' : 'Yeni Cari' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Şube</mat-label>
          <mat-select formControlName="branchId">
            @for (b of branches; track b.id) {
              <mat-option [value]="b.id">{{ b.code }} - {{ b.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-button-toggle-group class="kind-toggle" [(ngModel)]="kind" [ngModelOptions]="{standalone: true}" (change)="onKindChange()">
          <mat-button-toggle value="company">Şirket</mat-button-toggle>
          <mat-button-toggle value="person">Şahıs</mat-button-toggle>
        </mat-button-toggle-group>

        @if (kind === 'company') {
          <mat-form-field appearance="outline">
            <mat-label>Unvan</mat-label>
            <input matInput formControlName="name" maxlength="200" />
            @if (form.controls.name.hasError('required')) {
              <mat-error>Unvan gerekli</mat-error>
            }
          </mat-form-field>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Vergi No</mat-label>
              <input matInput formControlName="taxNumber" maxlength="10" />
              @if (form.controls.taxNumber.hasError('required')) {
                <mat-error>Vergi No gerekli</mat-error>
              } @else if (form.controls.taxNumber.hasError('minlength') || form.controls.taxNumber.hasError('maxlength')) {
                <mat-error>Vergi No 10 haneli olmalı</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Vergi Dairesi</mat-label>
              <input matInput formControlName="taxOffice" maxlength="100" />
              @if (form.controls.taxOffice.hasError('required')) {
                <mat-error>Vergi Dairesi gerekli</mat-error>
              }
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>MERSİS No</mat-label>
              <input matInput formControlName="mersisNo" maxlength="20" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ticaret Sicil No</mat-label>
              <input matInput formControlName="ticaretSicilNo" maxlength="20" />
            </mat-form-field>
          </div>
        } @else {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Ad</mat-label>
              <input matInput formControlName="firstName" maxlength="100" />
              @if (form.controls.firstName.hasError('required')) {
                <mat-error>Ad gerekli</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Soyad</mat-label>
              <input matInput formControlName="lastName" maxlength="100" />
              @if (form.controls.lastName.hasError('required')) {
                <mat-error>Soyad gerekli</mat-error>
              }
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>TC Kimlik No</mat-label>
            <input matInput formControlName="tckn" maxlength="11" />
            @if (form.controls.tckn.hasError('required')) {
              <mat-error>TC Kimlik No gerekli</mat-error>
            } @else if (form.controls.tckn.hasError('minlength') || form.controls.tckn.hasError('maxlength')) {
              <mat-error>TC Kimlik No 11 haneli olmalı</mat-error>
            }
          </mat-form-field>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Unvan</mat-label>
              <input matInput formControlName="title" maxlength="100" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Departman</mat-label>
              <input matInput formControlName="department" maxlength="100" />
            </mat-form-field>
          </div>
        }

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>E-posta</mat-label>
            <input matInput formControlName="email" maxlength="320" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Telefon</mat-label>
            <input matInput formControlName="phone" maxlength="40" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>IBAN</mat-label>
          <input matInput formControlName="iban" maxlength="34" />
        </mat-form-field>

        <div class="flags">
          <mat-checkbox formControlName="isCustomer" [disabled]="!!form.value.isRetail">Müşteri</mat-checkbox>
          <mat-checkbox formControlName="isVendor">Tedarikçi</mat-checkbox>
          <mat-checkbox formControlName="isEmployee">Personel</mat-checkbox>
          <mat-checkbox formControlName="isRetail" (change)="onRetailChange($event.checked)">Perakende</mat-checkbox>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close(null)">Vazgeç</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">Kaydet</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .fields { display:flex; flex-direction:column; gap:10px; min-width:420px; padding-top:8px; }
    .row { display:flex; gap:10px; }
    .row mat-form-field { flex:1; }
    .kind-toggle { align-self:flex-start; margin-bottom:4px; }
    .flags { display:flex; flex-wrap:wrap; gap:4px 16px; }
  `]
})
export class ContactFormDialogComponent {
  dialogRef = inject(MatDialogRef<ContactFormDialogComponent>);
  data = inject<ContactFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private branchesService = inject(BranchesService);

  branches: BranchListItemDto[] = [];
  kind: ContactKind = this.data.contact?.personDetails ? 'person' : 'company';

  form = this.fb.group({
    branchId: [this.data.contact?.branchId ?? this.data.defaultBranchId, Validators.required],
    name: [this.data.contact?.name ?? '', [Validators.maxLength(200)]],
    taxNumber: [this.data.contact?.companyDetails?.taxNumber ?? '', [Validators.maxLength(10)]],
    taxOffice: [this.data.contact?.companyDetails?.taxOffice ?? '', [Validators.maxLength(100)]],
    mersisNo: [this.data.contact?.companyDetails?.mersisNo ?? '', [Validators.maxLength(20)]],
    ticaretSicilNo: [this.data.contact?.companyDetails?.ticaretSicilNo ?? '', [Validators.maxLength(20)]],
    tckn: [this.data.contact?.personDetails?.tckn ?? '', [Validators.maxLength(11)]],
    firstName: [this.data.contact?.personDetails?.firstName ?? '', [Validators.maxLength(100)]],
    lastName: [this.data.contact?.personDetails?.lastName ?? '', [Validators.maxLength(100)]],
    title: [this.data.contact?.personDetails?.title ?? '', [Validators.maxLength(100)]],
    department: [this.data.contact?.personDetails?.department ?? '', [Validators.maxLength(100)]],
    email: [this.data.contact?.email ?? '', [Validators.maxLength(320)]],
    phone: [this.data.contact?.phone ?? '', [Validators.maxLength(40)]],
    iban: [this.data.contact?.iban ?? '', [Validators.maxLength(34)]],
    isCustomer: [this.data.contact?.isCustomer ?? false],
    isVendor: [this.data.contact?.isVendor ?? false],
    isEmployee: [this.data.contact?.isEmployee ?? false],
    isRetail: [this.data.contact?.isRetail ?? false]
  });

  constructor() {
    this.branchesService.list().subscribe(res => (this.branches = res));
    this.applyKindValidators();
  }

  onRetailChange(checked: boolean) {
    if (checked) this.form.patchValue({ isCustomer: false });
  }

  onKindChange(): void {
    this.applyKindValidators();
  }

  /**
   * Backend CreateContactValidator/UpdateContactValidator ile birebir aynı kural seti:
   * Şirket seçiliyken Unvan/Vergi No/Vergi Dairesi, Şahıs seçiliyken TC/Ad/Soyad zorunlu.
   * Bunlar client-side işaretlenmezse form "geçerli" görünüp backend'den 400 ile geri döner.
   */
  private applyKindValidators(): void {
    const isCompany = this.kind === 'company';
    const isPerson = this.kind === 'person';

    this.form.controls.name.setValidators(
      isCompany ? [Validators.required, Validators.maxLength(200)] : [Validators.maxLength(200)]
    );
    this.form.controls.taxNumber.setValidators(
      isCompany
        ? [Validators.required, Validators.minLength(10), Validators.maxLength(10)]
        : [Validators.maxLength(10)]
    );
    this.form.controls.taxOffice.setValidators(
      isCompany ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)]
    );

    this.form.controls.tckn.setValidators(
      isPerson
        ? [Validators.required, Validators.minLength(11), Validators.maxLength(11)]
        : [Validators.maxLength(11)]
    );
    this.form.controls.firstName.setValidators(
      isPerson ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)]
    );
    this.form.controls.lastName.setValidators(
      isPerson ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)]
    );

    for (const key of ['name', 'taxNumber', 'taxOffice', 'tckn', 'firstName', 'lastName'] as const) {
      this.form.controls[key].updateValueAndValidity();
    }
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    const result = {
      branchId: v.branchId!,
      name: this.kind === 'company' ? (v.name || '') : `${v.firstName} ${v.lastName}`.trim(),
      isCustomer: !!v.isCustomer,
      isVendor: !!v.isVendor,
      isEmployee: !!v.isEmployee,
      isRetail: !!v.isRetail,
      email: v.email || null,
      phone: v.phone || null,
      iban: v.iban || null,
      companyDetails: this.kind === 'company' ? {
        taxNumber: v.taxNumber || null,
        taxOffice: v.taxOffice || null,
        mersisNo: v.mersisNo || null,
        ticaretSicilNo: v.ticaretSicilNo || null
      } : null,
      personDetails: this.kind === 'person' ? {
        tckn: v.tckn || null,
        firstName: v.firstName || '',
        lastName: v.lastName || '',
        title: v.title || null,
        department: v.department || null
      } : null
    };

    this.dialogRef.close(result);
  }
}
