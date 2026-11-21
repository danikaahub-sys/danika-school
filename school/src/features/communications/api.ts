import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { isoDate, lower } from '@/lib/api-map'
import type { Announcement, MessageTemplate } from '@/mocks'

export function useCommunications() {
  return useQuery({
    queryKey: ['comms'],
    queryFn: async () => {
      const data = await api<{ announcements: Announcement[]; templates: MessageTemplate[] }>(
        '/school/communications'
      )
      return {
        announcements: data.announcements.map((item) => ({
          ...item,
          channel: lower<Announcement['channel']>(String(item.channel)),
          sentAt: isoDate(item.sentAt),
          audience:
            typeof item.audience === 'string'
              ? item.audience
              : JSON.stringify(item.audience ?? ''),
        })),
        templates: data.templates.map((item) => ({
          ...item,
          channel: lower<MessageTemplate['channel']>(String(item.channel)),
        })),
      }
    },
  })
}

export function useSendAnnouncement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/school/communications/announcements', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['comms'] }),
  })
}
