/**
 * QR code modules via the injected `qrcode-generator` factory (same library on both sides).
 * Data is encoded as UTF-8 bytes so Arabic text and URLs both work.
 */
export function qrMatrix(qrcodeFactory, text, ecLevel = 'M') {
  const value = String(text ?? '');
  if (!qrcodeFactory || !value) return null;
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  try {
    const qr = qrcodeFactory(0, ['L', 'M', 'Q', 'H'].includes(ecLevel) ? ecLevel : 'M');
    qr.addData(binary, 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    const rows = [];
    for (let r = 0; r < count; r += 1) {
      const row = new Uint8Array(count);
      for (let c = 0; c < count; c += 1) row[c] = qr.isDark(r, c) ? 1 : 0;
      rows.push(row);
    }
    return rows;
  } catch {
    return null; // too long for a QR code
  }
}
