/**
 * Money Utility Helper
 * 
 * Backend Money.cs ile uyumlu formatı sağlar.
 * 
 * Backend Format:
 * - Ondalık ayracı: NOKTA (InvariantCulture)
 * - Yuvarlama: MidpointRounding.AwayFromZero
 * - Örnekler: "1234.56" ✓ | "1234,56" ✗
 * 
 * @see Accounting.Application.Common.Utils.Money
 */

import Decimal from 'decimal.js';

/**
 * Decimal.js konfigürasyonu - Backend ile aynı yuvarlama
 */
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP, // MidpointRounding.AwayFromZero eşdeğeri
});

/**
 * Kullanıcı inputunu backend formatına normalize eder.
 * 
 * Dönüşümler:
 * - Virgül → Nokta (Türkçe klavye desteği)
 * - Boş/null → "0"
 * - Trim
 * 
 * @param value Kullanıcı input değeri
 * @returns Backend'e uygun format ("1234.56")
 * 
 * @example
 * normalizeMoneyInput("1234,56")  // "1234.56"
 * normalizeMoneyInput("10,5")     // "10.5"
 * normalizeMoneyInput(null)       // "0"
 * normalizeMoneyInput("")         // "0"
 */
export function normalizeMoneyInput(value: string | number | null | undefined): string {
  if (value == null) return '0';

  // Number ise string'e çevir
  const str = String(value);

  // Virgülü noktaya çevir
  const normalized = str.replace(',', '.').trim();

  // Boş string kontrolü
  return normalized === '' ? '0' : normalized;
}

/**
 * Backend Money string'ini Decimal'e çevirir.
 * 
 * @param value Backend'den gelen money string
 * @returns Decimal instance
 * 
 * @example
 * const total = parseMoneyString("1234.56");
 * const doubled = total.times(2);  // Decimal(2469.12)
 */
export function parseMoneyString(value: string | null | undefined): Decimal {
  return new Decimal(value ?? '0');
}

/**
 * Decimal değeri backend formatına çevirir.
 * 
 * @param value Decimal değer
 * @param decimals Ondalık basamak sayısı (default: 2)
 * @returns Backend formatında string ("1234.56")
 * 
 * @example
 * const total = new Decimal(1234.567);
 * formatMoneyString(total, 2)  // "1234.57"
 * formatMoneyString(total, 4)  // "1234.5670"
 */
export function formatMoneyString(value: Decimal, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Basit hesaplama için yardımcı - Miktar × Fiyat
 * 
 * @param qty Miktar (string veya number)
 * @param price Birim fiyat (string veya number)
 * @param decimals Sonuç ondalık basamak (default: 2)
 * @returns Hesaplanmış toplam string
 * 
 * @example
 * calculateTotal("10.5", "125.75", 2)  // "1320.38"
 */
export function calculateTotal(
  qty: string | number,
  price: string | number,
  decimals: number = 2
): string {
  const qtyDecimal = new Decimal(normalizeMoneyInput(qty));
  const priceDecimal = new Decimal(normalizeMoneyInput(price));
  const total = qtyDecimal.times(priceDecimal);
  return formatMoneyString(total, decimals);
}

/**
 * KDV hesaplama
 * 
 * @param net Net tutar
 * @param vatRate KDV oranı (örn: 20 = %20)
 * @param decimals Sonuç ondalık basamak (default: 2)
 * @returns KDV tutarı
 * 
 * @example
 * calculateVat("1000", 20)  // "200.00"
 */
export function calculateVat(
  net: string | number,
  vatRate: number,
  decimals: number = 2
): string {
  const netDecimal = new Decimal(normalizeMoneyInput(net));
  const rateDecimal = new Decimal(vatRate);
  const vat = netDecimal.times(rateDecimal).div(100);
  return formatMoneyString(vat, decimals);
}

/**
 * İskonto hesaplama (Oran bazlı)
 * 
 * @param amount Tutar
 * @param discountRate İskonto oranı (örn: 10 = %10)
 * @param decimals Sonuç ondalık basamak (default: 2)
 * @returns İskonto tutarı
 * 
 * @example
 * calculateDiscountByRate("1000", 10)  // "100.00"
 */
export function calculateDiscountByRate(
  amount: string | number,
  discountRate: number,
  decimals: number = 2
): string {
  const amountDecimal = new Decimal(normalizeMoneyInput(amount));
  const rateDecimal = new Decimal(discountRate);
  const discount = amountDecimal.times(rateDecimal).div(100);
  return formatMoneyString(discount, decimals);
}

/**
 * Tevkifat hesaplama
 * 
 * @param vat KDV tutarı
 * @param withholdingRate Tevkifat oranı (örn: 50 = %50)
 * @param decimals Sonuç ondalık basamak (default: 2)
 * @returns Tevkifat tutarı
 * 
 * @example
 * calculateWithholding("200", 50)  // "100.00"
 */
export function calculateWithholding(
  vat: string | number,
  withholdingRate: number,
  decimals: number = 2
): string {
  const vatDecimal = new Decimal(normalizeMoneyInput(vat));
  const rateDecimal = new Decimal(withholdingRate);
  const withholding = vatDecimal.times(rateDecimal).div(100);
  return formatMoneyString(withholding, decimals);
}

/**
 * Fatura satırı hesaplama (Tam workflow)
 * 
 * Net = (Qty × UnitPrice) - Discount
 * VAT = Net × (VatRate / 100)
 * Withholding = VAT × (WithholdingRate / 100)
 * Gross = Net + VAT
 * GrandTotal = Gross - Withholding
 * 
 * @returns Hesaplanmış değerler
 */
export function calculateInvoiceLine(params: {
  qty: string | number;
  unitPrice: string | number;
  vatRate: number;
  discountRate?: number;
  discountAmount?: string | number;
  withholdingRate?: number;
}) {
  const qty = new Decimal(normalizeMoneyInput(params.qty));
  const unitPrice = new Decimal(normalizeMoneyInput(params.unitPrice));
  const vatRate = new Decimal(params.vatRate);
  const discountRate = params.discountRate ? new Decimal(params.discountRate) : new Decimal(0);
  const discountAmount = params.discountAmount
    ? new Decimal(normalizeMoneyInput(params.discountAmount))
    : new Decimal(0);
  const withholdingRate = params.withholdingRate ? new Decimal(params.withholdingRate) : new Decimal(0);

  // Line Gross = Qty × UnitPrice
  const lineGross = qty.times(unitPrice);

  // Discount
  let discount = discountAmount;
  if (discount.isZero() && !discountRate.isZero()) {
    discount = lineGross.times(discountRate).div(100);
  }

  // Net = LineGross - Discount
  const net = lineGross.minus(discount);

  // VAT = Net × (VatRate / 100)
  const vat = net.times(vatRate).div(100);

  // Withholding = VAT × (WithholdingRate / 100)
  const withholding = vat.times(withholdingRate).div(100);

  // Gross = Net + VAT
  const gross = net.plus(vat);

  // GrandTotal = Gross - Withholding
  const grandTotal = gross.minus(withholding);

  return {
    lineGross: formatMoneyString(lineGross, 2),
    discount: formatMoneyString(discount, 2),
    net: formatMoneyString(net, 2),
    vat: formatMoneyString(vat, 2),
    withholding: formatMoneyString(withholding, 2),
    gross: formatMoneyString(gross, 2),
    grandTotal: formatMoneyString(grandTotal, 2),
  };
}

/**
 * Money string validasyonu - Backend formatına uygun mu?
 * 
 * @param value Kontrol edilecek değer
 * @returns true ise geçerli format
 * 
 * @example
 * isValidMoneyFormat("1234.56")   // true
 * isValidMoneyFormat("1234,56")   // true (normalize edilebilir)
 * isValidMoneyFormat("abc")       // false
 */
export function isValidMoneyFormat(value: string | null | undefined): boolean {
  if (!value) return true; // Boş geçerli (0 olarak kabul edilir)

  const normalized = normalizeMoneyInput(value);

  // InvariantCulture uyumlu regex: -?123.45
  return /^-?\d+(\.\d+)?$/.test(normalized);
}
