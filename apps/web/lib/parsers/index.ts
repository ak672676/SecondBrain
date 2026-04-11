import { parsePdf } from './pdf';
import { parseMarkdown } from './markdown';
import { parseTxt } from './txt';
import { parseDocx } from './docx';
import { parseCsv } from './csv';

// Returns a single string for most formats, or string[] for CSV (one per row).
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string | string[]> {
  switch (fileType) {
    case 'pdf':
      return parsePdf(buffer);
    case 'md':
      return parseMarkdown(buffer);
    case 'txt':
      return parseTxt(buffer);
    case 'docx':
      return parseDocx(buffer);
    case 'csv':
      return parseCsv(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
