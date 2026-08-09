namespace Accounting.Application.Common.Exceptions;

public sealed class NotFoundException : DomainException
{
    public NotFoundException(string resource, object? key = null)
        : base(
            code: "not_found",
            message: key is null
                ? $"{resource} bulunamadı."
                : $"{resource} bulunamadı. Anahtar: {key}"
        )
    { }
}
