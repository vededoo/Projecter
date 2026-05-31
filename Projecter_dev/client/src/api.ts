// Projecter — minimal API client
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${path}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export interface JsonApiItem<A> {
  type: string;
  id: string;
  attributes: A;
}
export interface JsonApiList<A>  { data: JsonApiItem<A>[] }
export interface JsonApiOne<A>   { data: JsonApiItem<A> }

export const api = {
  get:    <T>(p: string) => request<T>(p),
  post:   <T>(p: string, attributes: Record<string, unknown>, type: string) =>
    request<T>(p, { method: 'POST',  body: JSON.stringify({ data: { type, attributes } }) }),
  patch:  <T>(p: string, attributes: Record<string, unknown>, type: string) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify({ data: { type, attributes } }) }),
  del:    (p: string) => request<void>(p, { method: 'DELETE' }),
};
