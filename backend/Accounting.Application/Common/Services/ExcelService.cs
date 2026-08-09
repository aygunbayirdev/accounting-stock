using Accounting.Application.Common.Abstractions;
using ClosedXML.Excel;
using System.Reflection;

namespace Accounting.Application.Common.Services;

public class ExcelService : IExcelService
{
    public async Task<byte[]> ExportAsync<T>(IEnumerable<T> data, string sheetName)
    {
        return await Task.Run(() =>
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add(sheetName);

            // 1. Header Row
            var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
            
            for (int i = 0; i < properties.Length; i++)
            {
                worksheet.Cell(1, i + 1).Value = properties[i].Name;
            }

            // 2. Data Rows
            var list = data.ToList();
            if (list.Any())
            {
                worksheet.Cell(2, 1).InsertData(list);
            }

            // 3. Formatting
            var headerRange = worksheet.Range(1, 1, 1, properties.Length);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;
            
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }
}
