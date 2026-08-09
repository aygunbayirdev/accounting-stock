using Accounting.Domain.Common;

namespace Accounting.Domain.Entities;

public class CompanySettings : IHasTimestamps, IHasRowVersion
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? TradeRegisterNo { get; set; }
    public string? MersisNo { get; set; }
    public string? LogoUrl { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    
    // Initialized to prevent InMemory null errors
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
