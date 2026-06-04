import * as XLSX from 'xlsx';

export const APP_NAME = 'Costing Tool - Manufacturing ERP';

// ─── EXCEL EXPORT ────────────────────────────────────
export function exportToExcel(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  summary: Record<string, unknown>,
  fileName: string,
  reportTitle: string,
  dateRange: string,
) {
  const wb = XLSX.utils.book_new();

  // Header rows
  const headerRows = [
    [APP_NAME],
    [reportTitle],
    [`Date Range: ${dateRange}`],
    [`Generated: ${new Date().toLocaleString('en-IN')}`],
    [],
    columns.map((c) => c.label),
  ];

  // Data rows
  const dataRows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      return typeof val === 'object' && val !== null
        ? JSON.stringify(val)
        : val ?? '';
    })
  );

  // Summary rows
  const summaryRows = [
    [],
    ['SUMMARY'],
    ...Object.entries(summary).map(([k, v]) => [k, v]),
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ...headerRows,
    ...dataRows,
    ...summaryRows,
  ]);

  // Column widths
  ws['!cols'] = columns.map(() => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ─── PNG EXPORT ──────────────────────────────────────
export async function exportToPNG(elementId: string, fileName: string) {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
  });

  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ─── SHARE ───────────────────────────────────────────
export async function shareSnapshot(elementId: string, title: string) {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${title}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text: `${APP_NAME} - ${title}` });
    } else {
      // Fallback: download
      const link = document.createElement('a');
      link.download = `${title}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  });
}
