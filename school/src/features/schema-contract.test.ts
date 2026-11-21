import { describe, expect, it } from 'vitest'
import { positionSchema } from '@/features/admin/schema'
import {
  attendanceMarkSchema,
  attendanceStatusSchema,
} from '@/features/classroom/schema'
import { messageSchema } from '@/features/communications/schema'
import { receiptSchema } from '@/features/finance/schema'
import { attentionSchema } from '@/features/home/schema'
import { personDraftSchema } from '@/features/people/schema'
import { classSchema, yearSchema } from '@/features/setup/schema'

describe('feature schemas', () => {
  it('accepts the mock-shaped payloads the UI already uses', () => {
    expect(attendanceStatusSchema.parse('present')).toBe('present')
    expect(
      attendanceMarkSchema.parse({
        sessionId: 'se-1',
        studentId: 'st-1',
        status: 'late',
      }).status
    ).toBe('late')
    expect(personDraftSchema.parse({ firstName: 'علی', lastName: 'محمدی' }).firstName).toBe(
      'علی'
    )
    expect(yearSchema.parse({ id: 'y1405', label: '۱۴۰۵–۱۴۰۶', active: true }).active).toBe(
      true
    )
    expect(classSchema.parse({ id: 'c7a', name: 'الف', gradeId: 'g7' }).name).toBe('الف')
    expect(
      receiptSchema.parse({ studentId: 'st-1', amountIrr: 1000, ref: 'R-1' }).ref
    ).toBe('R-1')
    expect(
      messageSchema.parse({ title: 'اطلاعیه', body: 'متن', channel: 'sms' }).channel
    ).toBe('sms')
    expect(positionSchema.parse({ name: 'معلم', baseRole: 'teacher' }).baseRole).toBe(
      'teacher'
    )
    expect(
      attentionSchema.parse({
        attendance: 1,
        receipts: 2,
        grades: 0,
        importErrors: 0,
        guardians: 1,
      }).receipts
    ).toBe(2)
  })
})
