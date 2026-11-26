/**
 * Triggers a browser CSV file download from headers and rows data array
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  if (rows.length === 0) return;

  const csvRows = [
    headers,
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)),
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
