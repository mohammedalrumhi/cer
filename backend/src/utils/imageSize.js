/** Pixel size of PNG, JPEG, GIF, WebP and SVG images from their headers (no decoding). */
function imageSize(buffer) {
  if (!buffer || buffer.length < 24) return null;
  // PNG
  if (buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  // GIF
  if (buffer.toString('ascii', 0, 3) === 'GIF') return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  // WebP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG: walk the segments to the first SOF marker.
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  // SVG: width/height attributes or the viewBox.
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 4096));
  if (/<svg/i.test(text)) {
    const width = /\swidth="([\d.]+)/.exec(text);
    const height = /\sheight="([\d.]+)/.exec(text);
    if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
    const viewBox = /viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/.exec(text);
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }
  return null;
}

module.exports = { imageSize };
