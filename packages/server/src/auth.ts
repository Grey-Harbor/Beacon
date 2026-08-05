import { createHmac, timingSafeEqual } from 'node:crypto';

interface SessionPayload {
  username: string;
  expiresAt: number;
}

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

export class SessionCodec {
  constructor(private readonly secret: string) {}

  create(username: string) {
    const body = encode(JSON.stringify({ username, expiresAt: Date.now() + 12 * 60 * 60 * 1000 }));
    const signature = createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  verify(token: string | undefined): SessionPayload | null {
    if (!token) return null;
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      return null;
    }
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
      if (!payload.username || payload.expiresAt <= Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }
}

export function bearerMatches(header: string | undefined, expected: string) {
  if (!header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}
