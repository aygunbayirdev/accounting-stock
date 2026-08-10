import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompanySettingsService } from '../../core/services/company-settings.service';
import { CompanySettingsDto } from '../../core/models/company-settings.models';

@Component({
  standalone: true,
  selector: 'app-company-settings-page',
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCardModule
  ],
  template: `
    <mat-card class="settings-card" *ngIf="loaded">
      <mat-card-header>
        <mat-card-title>Firma Ayarları</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>Firma Ünvanı</mat-label>
              <input matInput formControlName="title" maxlength="200" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Vergi Numarası</mat-label>
              <input matInput formControlName="taxNumber" maxlength="20" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Vergi Dairesi</mat-label>
              <input matInput formControlName="taxOffice" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Telefon</mat-label>
              <input matInput formControlName="phone" maxlength="20" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>E-posta</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Web Sitesi</mat-label>
              <input matInput formControlName="website" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ticaret Sicil No</mat-label>
              <input matInput formControlName="tradeRegisterNo" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>MERSİS No</mat-label>
              <input matInput formControlName="mersisNo" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Logo URL</mat-label>
              <input matInput formControlName="logoUrl" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Adres</mat-label>
              <textarea matInput formControlName="address" rows="2"></textarea>
            </mat-form-field>
          </div>
          <div class="actions">
            <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || saving">Kaydet</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .settings-card { max-width: 900px; margin: 16px 0; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 8px 16px; }
    .grid .full { grid-column: 1 / -1; }
    .actions { display:flex; justify-content:flex-end; padding-top: 8px; }
  `]
})
export class CompanySettingsPageComponent implements OnInit {
  private service = inject(CompanySettingsService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  loaded = false;
  saving = false;
  private current!: CompanySettingsDto;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    taxNumber: ['', [Validators.required, Validators.maxLength(20)]],
    taxOffice: [''],
    address: [''],
    phone: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email]],
    website: [''],
    tradeRegisterNo: [''],
    mersisNo: [''],
    logoUrl: ['']
  });

  ngOnInit() {
    this.service.get().subscribe(dto => {
      this.current = dto;
      this.form.patchValue({
        title: dto.title,
        taxNumber: dto.taxNumber ?? '',
        taxOffice: dto.taxOffice ?? '',
        address: dto.address ?? '',
        phone: dto.phone ?? '',
        email: dto.email ?? '',
        website: dto.website ?? '',
        tradeRegisterNo: dto.tradeRegisterNo ?? '',
        mersisNo: dto.mersisNo ?? '',
        logoUrl: dto.logoUrl ?? ''
      });
      this.loaded = true;
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving = true;
    this.service.update({
      id: this.current.id,
      rowVersionBase64: this.current.rowVersionBase64,
      title: v.title!,
      taxNumber: v.taxNumber || null,
      taxOffice: v.taxOffice || null,
      address: v.address || null,
      phone: v.phone || null,
      email: v.email || null,
      website: v.website || null,
      tradeRegisterNo: v.tradeRegisterNo || null,
      mersisNo: v.mersisNo || null,
      logoUrl: v.logoUrl || null
    }).subscribe({
      next: (updated) => {
        this.current = updated;
        this.saving = false;
        this.snack.open('Firma ayarları güncellendi.', 'Kapat', { duration: 2000 });
      },
      error: () => { this.saving = false; }
    });
  }
}
