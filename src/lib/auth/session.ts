import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE_NAME = 'cakecart_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'cakecart-super-secret-development-key-32-chars-long!'
);

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'BAKER';
}

export async function createSession(user: UserSession): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return token;
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as 'CUSTOMER' | 'BAKER',
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function requireBaker(): Promise<UserSession> {
  const session = await getSession();
  if (!session || session.role !== 'BAKER') {
    throw new Error('Forbidden: Baker access required');
  }
  return session;
}

export async function requireCustomer(): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized: Please log in to continue');
  }
  return session;
}
