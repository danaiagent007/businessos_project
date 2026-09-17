/**
 * Typed API client — wraps fetch with auth headers from Clerk.
 * Always uses /api prefix which Vite proxies to the Express backend in dev,
 * and is the real backend URL in production.
 */
import { useAuth } from '@clerk/clerk-react'

const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(
  path: string,
  options: RequestInit = {},
  getToken: () => Promise<string | null>,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({ error: 'Invalid server response.' }))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

// Hook-based API client — call inside components
export function useApiClient() {
  const { getToken } = useAuth()
  const token = () => getToken()

  return {
    leads: {
      list:     ()               => request<{ leads: unknown[] }>('/api/leads', {}, token),
      get:      (id: string)     => request<{ lead: unknown }>(`/api/leads/${id}`, {}, token),
      pipeline: ()               => request<{ summary: unknown[] }>('/api/leads/pipeline', {}, token),
      create:   (body: unknown)  => request<{ lead: unknown }>('/api/leads', { method: 'POST', body: JSON.stringify(body) }, token),
      update:   (id: string, body: unknown) => request<{ lead: unknown }>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
      delete:   (id: string)     => request<void>(`/api/leads/${id}`, { method: 'DELETE' }, token),
      generateFollowup: (id: string, style: 'whatsapp' | 'email') =>
        request<{ message: string; style: string }>(`/api/leads/${id}/generate-followup`, { method: 'POST', body: JSON.stringify({ style }) }, token),
    },
    customers: {
      list:   ()               => request<{ customers: unknown[] }>('/api/customers', {}, token),
      stats:  ()               => request<{ stats: unknown }>('/api/customers/stats', {}, token),
      get:    (id: string)     => request<{ customer: unknown }>(`/api/customers/${id}`, {}, token),
      create: (body: unknown)  => request<{ customer: unknown }>('/api/customers', { method: 'POST', body: JSON.stringify(body) }, token),
      update: (id: string, body: unknown) => request<{ customer: unknown }>(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
      delete: (id: string)     => request<void>(`/api/customers/${id}`, { method: 'DELETE' }, token),
    },
    kb: {
      list:    ()               => request<{ entries: unknown[] }>('/api/kb', {}, token),
      context: ()               => request<{ context: string }>('/api/kb/context', {}, token),
      create:  (body: unknown)  => request<{ entry: unknown }>('/api/kb', { method: 'POST', body: JSON.stringify(body) }, token),
      update:  (id: string, body: unknown) => request<{ entry: unknown }>(`/api/kb/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
      delete:  (id: string)     => request<void>(`/api/kb/${id}`, { method: 'DELETE' }, token),
    },
    conversations: {
      list:    ()               => request<{ conversations: unknown[] }>('/api/conversations', {}, token),
      messages:(id: string)    => request<{ conversation: unknown; messages: unknown[] }>(`/api/conversations/${id}/messages`, {}, token),
      send:    (id: string, content: string) => request<{ message: unknown }>(`/api/conversations/${id}/send`, { method: 'POST', body: JSON.stringify({ content }) }, token),
      approve: (msgId: string, content?: string) => request<{ ok: boolean }>(`/api/conversations/messages/${msgId}/approve`, { method: 'POST', body: JSON.stringify({ content }) }, token),
      reject:  (msgId: string) => request<{ ok: boolean }>(`/api/conversations/messages/${msgId}/reject`, { method: 'POST', body: JSON.stringify({}) }, token),
    },
  }
}
