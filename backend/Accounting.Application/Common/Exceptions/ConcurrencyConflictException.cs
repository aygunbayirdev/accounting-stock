namespace Accounting.Application.Common.Exceptions;

public sealed class ConcurrencyConflictException : DomainException
{
    public ConcurrencyConflictException(string message = "Kaynak başka biri tarafından değiştirildi.")
        : base("concurrency_conflict", message) { }
}
