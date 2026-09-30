export const API = 'http://localhost:4310/api';

export async function login() {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const { token } = await response.json();
  if (!token) throw new Error('login failed');
  return token;
}

export function authed(token) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  return {
    get: async (path) => (await fetch(`${API}${path}`, { headers })).json(),
    post: async (path, body) => fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }),
  };
}

/** Log the browser context in by seeding the token the app reads from localStorage. */
export async function authenticate(context, token) {
  await context.addInitScript((value) => localStorage.setItem('auth_token', value), token);
}
