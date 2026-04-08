import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

export function getIpHash(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  return createHash('sha256').update(ip).digest('hex');
}
