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

  const headerRows = [
    [APP_NAME],
    [reportTitle],
    [`Date Range: ${dateRange}`],
    [`Generated: ${new Date().toLocaleString('en-IN')}`],
    [],
    columns.map((c) => c.label),
  ];

  const dataRows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      return typeof val === 'object' && val !== null ? JSON.stringify(val) : val ?? '';
    })
  );

  const summaryRows = [
    [],
    ['SUMMARY'],
    ...Object.entries(summary).map(([k, v]) => [k, v]),
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, ...summaryRows]);
  ws['!cols'] = columns.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ─── PNG EXPORT ──────────────────────────────────────
export async function exportToPNG(elementId: string, fileName: string): Promise<string | null> {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  if (!element) return null;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: true,
  });

  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

// ─── GET PNG BLOB ────────────────────────────────────
export async function getSnapshotBlob(elementId: string): Promise<{ blob: Blob; dataUrl: string } | null> {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  if (!element) return null;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const dataUrl = canvas.toDataURL('image/png');

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve({ blob, dataUrl });
      else resolve(null);
    }, 'image/png');
  });
}

// ─── SHARE ───────────────────────────────────────────
export async function shareSnapshot(
  elementId: string,
  title: string,
  onShowShareDialog: (dataUrl: string, blob: Blob, title: string) => void,
) {
  const result = await getSnapshotBlob(elementId);
  if (!result) return;

  const { blob, dataUrl } = result;
  const file = new File([blob], `${title}.png`, { type: 'image/png' });

  // Try native share on mobile
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: `${APP_NAME} - ${title}` });
      return;
    } catch {
      // User cancelled or not supported - fall through to dialog
    }
  }

  // Show custom share dialog
  onShowShareDialog(dataUrl, blob, title);
}
