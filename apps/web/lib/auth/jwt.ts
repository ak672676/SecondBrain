import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { JWTPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'sb-token';
const EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN_SECONDS });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME };
