import { toFaDigits } from '@/lib/fa-text'

export function formatJalali(iso: string): string {
  const date = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return toFaDigits(date.toLocaleDateString('fa-IR'))
}

export function weekdayName(day: number): string {
  return ['', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'][day] ?? ''
}
