const BASE = '/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export const api = {
  login: (name: string) =>
    request('/login', { method: 'POST', body: JSON.stringify({ name }) }),

  getSettings: (userId: number) =>
    request(`/users/${userId}/settings`),

  updateSettings: (userId: number, settings: Record<string, any>) =>
    request(`/users/${userId}/settings`, { method: 'PUT', body: JSON.stringify(settings) }),

  getDays: (userId: number) =>
    request(`/users/${userId}/days`),

  toggleDay: (userId: number, date: string, type: string = 'pto') =>
    request(`/users/${userId}/days`, { method: 'POST', body: JSON.stringify({ date, type }) }),

  getRecommendations: (userId: number) =>
    request(`/users/${userId}/recommendations`),

  toggleRecommendation: (userId: number, key: string, enabled: boolean) =>
    request(`/users/${userId}/recommendations`, { method: 'POST', body: JSON.stringify({ key, enabled }) }),
};
