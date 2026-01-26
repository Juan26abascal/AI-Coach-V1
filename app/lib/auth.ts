import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'ai_coach_session';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export function getSessionUser(): SessionUser | null {
  const cookie = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as SessionUser;
  } catch (error) {
    return null;
  }
}

export function requireSessionUser() {
  const user = getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
