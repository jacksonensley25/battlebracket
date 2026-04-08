import { NextRequest } from 'next/server';

export function isAdminAuthenticated(req: NextRequest): boolean {
  const session = req.cookies.get('admin_session');
  return session?.value === 'authenticated';
}
