using Accounting.Application.Common.Exceptions;
using Accounting.Application.Common.Utils;
using Accounting.Domain.Enums;

namespace Accounting.Application.Services;

/// <summary>
/// Single source of truth for "does this movement type add to or remove from a
/// warehouse's stock, and what's the resulting quantity". Used by both
/// CreateStockMovementHandler (single movement) and CreateInvoiceHandler's
/// batched invoice-line stock sync, so the two can't drift on the sign rule.
/// </summary>
public static class StockQuantityCalculator
{
    public static bool IsIncoming(StockMovementType type) =>
        type is StockMovementType.PurchaseIn or StockMovementType.AdjustmentIn or StockMovementType.SalesReturn;

    /// <summary>
    /// Returns the new snapshot quantity after applying the movement.
    /// Throws BusinessRuleException if the result would go negative.
    /// </summary>
    public static decimal ApplyMovement(decimal currentQuantity, StockMovementType type, decimal quantity)
    {
        var signedQty = IsIncoming(type) ? quantity : -quantity;
        var newQty = DecimalExtensions.RoundQuantity(currentQuantity + signedQty);

        if (newQty < 0m)
            throw new BusinessRuleException("Yetersiz stok.");

        return newQty;
    }
}
