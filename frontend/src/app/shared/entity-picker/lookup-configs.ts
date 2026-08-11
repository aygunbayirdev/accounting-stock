/**
 * EntityPickerComponent'in `lookup` girdisi için hazır kolon/sıralama/eşleme tanımları.
 * Item/Contact/CashBankAccount lookup dialog'unu kullanan tüm formlarda tekrar
 * tanımlanmasın diye burada tekilleştirildi.
 */
import { ColDef } from 'ag-grid-community';
import { PickerOption } from './entity-picker.component';
import { ItemListItemDto, ItemType, ItemTypeNames } from '../../core/models/item.models';
import { ContactListItemDto, getContactType } from '../../core/models/contact.models';
import { CashBankAccountListItemDto, getAccountTypeDisplayName } from '../../core/models/cash-bank-account.models';

export const ITEM_LOOKUP_COLUMNS: ColDef<ItemListItemDto>[] = [
  { field: 'code', headerName: 'Kod', sortable: true, minWidth: 90 },
  { field: 'name', headerName: 'Ad', sortable: true, minWidth: 140 },
  { headerName: 'Tür', sortable: false, minWidth: 90, valueGetter: p => p.data ? (ItemTypeNames[p.data.type as ItemType] ?? p.data.type) : '' },
  { field: 'unit', headerName: 'Birim', sortable: false, minWidth: 70 },
  { field: 'salesPrice', headerName: 'Satış Fiyatı', sortable: true, type: 'rightAligned', minWidth: 100 }
];
export const ITEM_LOOKUP_SORT_WHITELIST = ['code', 'name', 'vatrate', 'price'];
export const itemToOption = (row: ItemListItemDto): PickerOption => ({ id: row.id, label: row.code, sublabel: row.name });

export const CONTACT_LOOKUP_COLUMNS: ColDef<ContactListItemDto>[] = [
  { field: 'code', headerName: 'Kod', sortable: true, minWidth: 90 },
  { field: 'name', headerName: 'Ad / Unvan', sortable: true, minWidth: 160 },
  { headerName: 'Tür', sortable: false, minWidth: 110, valueGetter: p => p.data ? getContactType(p.data) : '' },
  { field: 'email', headerName: 'E-posta', sortable: false, minWidth: 130 }
];
export const CONTACT_LOOKUP_SORT_WHITELIST = ['code', 'name'];
export const contactToOption = (row: ContactListItemDto): PickerOption => ({ id: row.id, label: row.code, sublabel: row.name });

export const CASH_BANK_ACCOUNT_LOOKUP_COLUMNS: ColDef<CashBankAccountListItemDto>[] = [
  { field: 'code', headerName: 'Kod', sortable: false, minWidth: 90 },
  { field: 'name', headerName: 'Ad', sortable: true, minWidth: 130 },
  { headerName: 'Tür', sortable: true, colId: 'type', minWidth: 80, valueGetter: p => p.data ? getAccountTypeDisplayName(p.data.type) : '' },
  { field: 'iban', headerName: 'IBAN', sortable: false, minWidth: 130 },
  { field: 'balance', headerName: 'Bakiye', sortable: false, type: 'rightAligned', minWidth: 90 }
];
export const CASH_BANK_ACCOUNT_LOOKUP_SORT_WHITELIST = ['name', 'type'];
export const cashBankAccountToOption = (row: CashBankAccountListItemDto): PickerOption =>
  ({ id: row.id, label: row.code, sublabel: `${row.name} (${row.currency})` });
