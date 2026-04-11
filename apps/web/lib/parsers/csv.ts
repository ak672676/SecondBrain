import Papa from 'papaparse';

// CSV parser returns one string per row, with column headers prepended.
// Each row becomes its own chunk — no further token splitting needed.
export async function parseCsv(buffer: Buffer): Promise<string[]> {
  const text = buffer.toString('utf-8');
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (!result.data || result.data.length === 0) {
    return [];
  }

  const headers = result.meta.fields || Object.keys(result.data[0]);

  return result.data.map((row) => {
    return headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
  });
}
