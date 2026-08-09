using Accounting.Application.Common.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Accounting.Api.Middleware;

public sealed class ExceptionToProblemDetailsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionToProblemDetailsMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionToProblemDetailsMiddleware(
        RequestDelegate next,
        ILogger<ExceptionToProblemDetailsMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task Invoke(HttpContext context)
    {
        var ct = context.RequestAborted;

        try
        {
            await _next(context);
        }
        catch (ValidationException vex)
        {
            // FluentValidation -> 400 + ProblemDetails
            var errors = vex.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            var pd = new ProblemDetails
            {
                Title = "Validation error",
                Status = StatusCodes.Status400BadRequest,
                Detail = "Request validation failed."
            };
            pd.Extensions["errors"] = errors;
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json";

            await JsonSerializer.SerializeAsync(
                context.Response.Body,
                pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase },
                cancellationToken: ct
            );
        }
        catch (NotFoundException nfex)
        {
            // Domain NotFoundException -> 404 + ProblemDetails
            var pd = new ProblemDetails
            {
                Title = "Kaynak bulunamadı",
                Status = StatusCodes.Status404NotFound,
                Detail = nfex.Message
            };
            pd.Extensions["code"] = nfex.Code; // "not_found"
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            context.Response.ContentType = "application/problem+json";

            await JsonSerializer.SerializeAsync(
                context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase },
                cancellationToken: ct
            );
        }
        catch (KeyNotFoundException knf)
        {
            var pd = new ProblemDetails
            {
                Title = "Not Found",
                Status = StatusCodes.Status404NotFound,
                Detail = knf.Message
            };
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            context.Response.ContentType = "application/problem+json";

            await JsonSerializer.SerializeAsync(
                context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase },
                cancellationToken: ct
            );
        }
        // 409 - Concurrency (bizim domain exception)
        catch (ConcurrencyConflictException cex)
        {
            var pd = new ProblemDetails
            {
                Title = "Eşzamanlılık çakışması",
                Status = StatusCodes.Status409Conflict,
                Detail = cex.Message, // kullanıcı dostu mesaj
                Type = "about:blank"
            };
            pd.Extensions["code"] = cex.Code; // "concurrency_conflict"
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status409Conflict;
            context.Response.ContentType = "application/problem+json";
            await JsonSerializer.SerializeAsync(context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, ct);
            return;
        }
        // 422 - İş kuralı ihlali
        catch (BusinessRuleException brex)
        {
            var pd = new ProblemDetails
            {
                Title = "İş kuralı ihlali",
                Status = StatusCodes.Status422UnprocessableEntity,
                Detail = brex.Message,
                Type = "about:blank"
            };
            pd.Extensions["code"] = brex.Code; // "business_rule_violation"
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
            context.Response.ContentType = "application/problem+json";
            await JsonSerializer.SerializeAsync(context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, ct);
            return;
        }
        catch (UnauthorizedAccessException uex)
        {
            var pd = new ProblemDetails
            {
                Title = "Yetkisiz Erişim",
                Status = StatusCodes.Status401Unauthorized,
                Detail = uex.Message,
                Type = "about:blank"
            };
            pd.Extensions["code"] = "unauthorized";
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/problem+json";
            await JsonSerializer.SerializeAsync(context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, ct);
            return;
        }
        // 409 - EF concurrency doğrudan gelirse (fallback)
        catch (DbUpdateConcurrencyException)
        {
            var pd = new ProblemDetails
            {
                Title = "Eşzamanlılık çakışması",
                Status = StatusCodes.Status409Conflict,
                Detail = "Kayıt başka bir kullanıcı tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin."
            };
            pd.Extensions["code"] = "concurrency_conflict";
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status409Conflict;
            context.Response.ContentType = "application/problem+json";
            await JsonSerializer.SerializeAsync(context.Response.Body, pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, ct);
            return;
        }
        catch (Exception ex)
        {
            // Diğer her şey -> 500 + ProblemDetails
            _logger.LogError(ex, "Unhandled exception");

            var pd = new ProblemDetails
            {
                Title = "Unexpected error",
                Status = StatusCodes.Status500InternalServerError,
                Detail = _env.IsDevelopment() ? ex.ToString() : "An error occurred."
            };
            pd.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";

            await JsonSerializer.SerializeAsync(
                context.Response.Body,
                pd,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            );
        }
    }
}
