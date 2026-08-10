import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BranchDto } from '../../core/models/branch.models';

export interface BranchFormDialogData {
  branch: BranchDto | null; // null => oluştur
}

@Component({
  standalone: true,
  selector: 'app-branch-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.branch ? 'Şubeyi Düzenle' : 'Yeni Şube' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Kod</mat-label>
          <input matInput formControlName="code" maxlength="20" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ad</mat-label>
          <input matInput formControlName="name" maxlength="100" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close(null)">Vazgeç</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">Kaydet</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .fields { display:flex; flex-direction:column; gap:8px; min-width:320px; padding-top:8px; }
  `]
})
export class BranchFormDialogComponent {
  dialogRef = inject(MatDialogRef<BranchFormDialogComponent>);
  data = inject<BranchFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    code: [this.data.branch?.code ?? '', [Validators.required, Validators.maxLength(20)]],
    name: [this.data.branch?.name ?? '', [Validators.required, Validators.maxLength(100)]]
  });

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}
