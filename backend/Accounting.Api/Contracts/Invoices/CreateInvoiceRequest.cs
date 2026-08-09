namespace Accounting.Api.Contracts.Invoices;

public record CreateInvoiceRequest(
    int ContactId,
    string DateUtc,
    string Currency,
    List<CreateInvoiceLine> Lines
);

public record CreateInvoiceLine(
    int ItemId,
    decimal Qty,
    decimal UnitPrice,
    int VatRate
);
