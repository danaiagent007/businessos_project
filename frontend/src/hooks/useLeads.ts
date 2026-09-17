import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/lib/api'
import type { Lead, LeadInput } from '@business-os/shared'
import { useOrganization } from '@clerk/clerk-react'

const LEADS_KEY = (orgId: string) => ['leads', orgId]

export function useLeads() {
  const api = useApiClient()
  const { organization } = useOrganization()
  const orgId = organization?.id ?? ''

  return useQuery({
    queryKey: LEADS_KEY(orgId),
    queryFn: () => api.leads.list() as Promise<{ leads: Lead[] }>,
    enabled: !!orgId,
    select: (data) => data.leads,
  })
}

export function useCreateLead() {
  const api = useApiClient()
  const { organization } = useOrganization()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: LeadInput) => api.leads.create(input) as Promise<{ lead: Lead }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_KEY(organization?.id ?? '') })
    },
  })
}

export function useUpdateLead() {
  const api = useApiClient()
  const { organization } = useOrganization()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...input }: LeadInput & { id: string }) =>
      api.leads.update(id, input) as Promise<{ lead: Lead }>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_KEY(organization?.id ?? '') })
    },
  })
}

export function useDeleteLead() {
  const api = useApiClient()
  const { organization } = useOrganization()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.leads.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_KEY(organization?.id ?? '') })
    },
  })
}
