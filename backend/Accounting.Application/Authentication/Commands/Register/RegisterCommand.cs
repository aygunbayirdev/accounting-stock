using Accounting.Application.Authentication.Common;
using MediatR;

namespace Accounting.Application.Authentication.Commands.Register;

public record RegisterCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password
) : IRequest<AuthenticationResult>;
