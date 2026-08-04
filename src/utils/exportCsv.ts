export function convertRowsToCSV(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0) return '';

  const cols = columns.length > 0 ? columns : Object.keys(data[0]);

  const header = cols.join(',');

  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  return [header, ...rows].join('\n');
}

export function downloadCsvFile(
  data: Record<string, unknown>[],
  columns: string[],
  filename?: string,
): void {
  const csvContent = convertRowsToCSV(data, columns);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename ?? `beleh-export-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
