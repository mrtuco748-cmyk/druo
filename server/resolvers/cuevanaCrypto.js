// Utilidades criptográficas y desempaquetado para Cuevana / Embeds
import crypto from 'node:crypto';

export function deriveLinkKey(challenge, salt) {
  return crypto.createHash('sha256').update(challenge + salt).digest();
}

export function decryptAES(b64, keyBuf) {
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

export function unpackDeanEdwards(script) {
  const m = script.match(/}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/s);
  if (!m) return null;
  let p = m[1];
  const a = parseInt(m[2], 10);
  let c = parseInt(m[3], 10);
  const k = m[4].split('|');

  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

export function solvePow(challenge, difficulty, salt) {
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;
  while (true) {
    const hash = crypto.createHash('sha256').update(challenge + nonce).digest('hex');
    if (hash.startsWith(prefix)) break;
    nonce++;
  }
  return crypto.createHash('sha256').update(challenge + nonce + salt).digest();
}
