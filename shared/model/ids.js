const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** Short collision-resistant id (~62 bits), e.g. `el_k3x9q0m2ab7f`. */
export function createId(prefix = 'el') {
  let id = '';
  for (const byte of randomBytes(12)) id += ALPHABET[byte % ALPHABET.length];
  return `${prefix}_${id}`;
}
