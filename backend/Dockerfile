FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Accounting.Api/Accounting.Api.csproj Accounting.Api/
COPY Accounting.Application/Accounting.Application.csproj Accounting.Application/
COPY Accounting.Domain/Accounting.Domain.csproj Accounting.Domain/
COPY Accounting.Infrastructure/Accounting.Infrastructure.csproj Accounting.Infrastructure/
RUN dotnet restore Accounting.Api/Accounting.Api.csproj

COPY Accounting.Api/ Accounting.Api/
COPY Accounting.Application/ Accounting.Application/
COPY Accounting.Domain/ Accounting.Domain/
COPY Accounting.Infrastructure/ Accounting.Infrastructure/

RUN dotnet publish Accounting.Api/Accounting.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Accounting.Api.dll"]
