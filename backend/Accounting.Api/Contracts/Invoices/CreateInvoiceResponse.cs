namespace Accounting.Api.Contracts.Invoices;

public record CreateInvoiceResponse(
    int Id,
    string TotalNet,
    string TotalVat,
    string TotalGross,
    string RoundingPolicy
);
