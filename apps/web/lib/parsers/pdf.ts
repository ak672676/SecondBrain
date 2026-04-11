export async function parsePdf(buffer: Buffer): Promise<string> {
  // Use require to avoid Next.js webpack bundling issues with pdf-parse.
  // The eval('require') trick prevents webpack from trying to bundle it.
  // eslint-disable-next-line no-eval
  const pdfParse = eval('require')('pdf-parse');
  const result = await pdfParse(buffer);
  return result.text;
}
