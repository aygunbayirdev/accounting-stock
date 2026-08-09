using FluentValidation;

namespace Accounting.Application.CompanySettings.Commands.Update;

public class UpdateCompanySettingsValidator : AbstractValidator<UpdateCompanySettingsCommand>
{
    public UpdateCompanySettingsValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Firma ünvanı boş olamaz.")
            .MaximumLength(200).WithMessage("Firma ünvanı en fazla 200 karakter olabilir.");

        RuleFor(x => x.TaxNumber)
            .NotEmpty().WithMessage("Vergi numarası zorunludur.")
            .MaximumLength(20).WithMessage("Vergi numarası en fazla 20 karakter olabilir.");

        RuleFor(x => x.Email)
            .EmailAddress().When(x => !string.IsNullOrEmpty(x.Email))
            .WithMessage("Geçersiz e-posta adresi formatı.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("Telefon numarası çok uzun.");
    }
}
