
const OOXML: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const LEGACY: Record<string, string> = {
  doc: 'application/msword',
  xls: 'application/vnd.ms-excel',
  ppt: 'application/vnd.ms-powerpoint',
};
const TEXT: Record<string, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  json: 'application/json',
  rtf: 'application/rtf',
};

export const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  ...Object.values(OOXML),
  ...Object.values(LEGACY),
  ...Object.values(TEXT),
  'application/zip',
]);

function at(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

function extname(name = ''): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function isExecutable(buf: Buffer): boolean {
  return (
    at(buf, [0x4d, 0x5a]) ||
    at(buf, [0x7f, 0x45, 0x4c, 0x46]) ||
    at(buf, [0xca, 0xfe, 0xba, 0xbe]) ||
    at(buf, [0xfe, 0xed, 0xfa]) ||
    at(buf, [0x23, 0x21])
  );
}

export function detectMime(buf: Buffer, declared = '', filename = ''): string | null {
  if (at(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  if (at(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (at(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (at(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (at(buf, [0x52, 0x49, 0x46, 0x46]) && at(buf, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';

  if (isExecutable(buf)) return null;
  const ext = extname(filename);

  if (
    at(buf, [0x50, 0x4b, 0x03, 0x04]) ||
    at(buf, [0x50, 0x4b, 0x05, 0x06]) ||
    at(buf, [0x50, 0x4b, 0x07, 0x08])
  ) {
    const head = buf.subarray(0, Math.min(buf.length, 65536)).toString('latin1');
    if (head.includes('word/')) return OOXML.docx;
    if (head.includes('xl/')) return OOXML.xlsx;
    if (head.includes('ppt/')) return OOXML.pptx;
    return OOXML[ext] ?? 'application/zip';
  }

  if (at(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return LEGACY[ext] ?? (ALLOWED_MIME.has(declared) ? declared : null);
  }

  if (TEXT[ext]) return TEXT[ext];
  if ((Object.values(TEXT) as string[]).includes(declared)) return declared;

  return null;
}
