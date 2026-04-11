import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from './jwt';
import { JWTPayload } from '@/lib/types';

// Extract and verify the current user from the JWT cookie.
// Use this in API routes and server components to get the authenticated user.
// Returns null if no valid token is found.
export function getCurrentUser(): JWTPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
