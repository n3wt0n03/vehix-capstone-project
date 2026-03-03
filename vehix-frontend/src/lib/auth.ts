export interface User {
  [key: string]: unknown;
}

export function saveSession(token: string, user: User): void {
  console.log("[saveSession] saving token:", token);
  console.log("[saveSession] saving user:", user);
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getSession(): { token: string | null; user: User | null } {
  return {
    token: localStorage.getItem('token'),
    user: getUser(),
  };
}

export function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser(): User | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
