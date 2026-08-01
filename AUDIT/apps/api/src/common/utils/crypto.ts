import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
