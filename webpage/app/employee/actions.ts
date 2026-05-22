'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ADMIN_TASK_STATUSES } from '@/lib/admin/status'
import { recordAuditLog } from '@/lib/audit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requirePageRole } from '@/lib/supabase/role-guard'

const taskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(ADMIN_TASK_STATUSES),
})

const workUpdateSchema = z.object({
  kind: z.enum(['inspection', 'maintenance', 'support']),
  itemId: z.string().uuid(),
  status: z.string().trim().min(2),
})

const workStatusByKind = {
  inspection: ['requested', 'scheduled', 'in_progress', 'completed', 'cancelled', 'needs_followup'],
  maintenance: ['open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed', 'cancelled'],
  support: ['open', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'],
} as const

const tableByKind = {
  inspection: 'inspections',
  maintenance: 'maintenance_requests',
  support: 'support_tickets',
} as const

function employeeRedirect(kind: 'success' | 'error', code: string, section = 'tasks'): never {
  redirect(`/employee?${kind}=${code}#${section}`)
}

async function getEmployeeContext() {
  const { user } = await requirePageRole(['employee', 'admin'])
  const supabase = createSupabaseAdminClient()
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id,profile_id,active,employee_role')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!employee || !employee.active) throw new Error('Active employee record not found.')

  return { supabase, user, employee }
}

export async function updateMyAdminTask(formData: FormData) {
  const parsed = taskUpdateSchema.safeParse({
    taskId: formData.get('taskId'),
    status: formData.get('status'),
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_task_update')

  let taskId: string | null = null
  let failure: string | null = null

  try {
    const { supabase, user, employee } = await getEmployeeContext()
    const { data: existing, error: existingError } = await supabase
      .from('admin_task_assignments')
      .select('id,status,priority,due_at,assigned_employee_id,entity_type,entity_id')
      .eq('id', parsed.data.taskId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Assigned task not found.')

    const { error } = await supabase
      .from('admin_task_assignments')
      .update({ status: parsed.data.status })
      .eq('id', existing.id)
      .eq('assigned_employee_id', employee.id)

    if (error) throw error
    taskId = existing.id

    await recordAuditLog({
      actorId: user.id,
      action: 'employee.admin_task.updated',
      entityType: 'admin_task_assignment',
      entityId: existing.id,
      metadata: {
        previous_status: existing.status,
        status: parsed.data.status,
        assigned_employee_id: employee.id,
        source_entity_type: existing.entity_type,
        source_entity_id: existing.entity_id,
      },
    })
  } catch (error) {
    console.error('Employee task update failed:', error)
    failure = 'task_update_failed'
  }

  if (failure || !taskId) employeeRedirect('error', failure ?? 'task_update_failed')

  revalidatePath('/employee')
  revalidatePath('/admin/dashboard/employees')
  employeeRedirect('success', 'task_updated')
}

export async function updateAssignedWorkItem(formData: FormData) {
  const parsed = workUpdateSchema.safeParse({
    kind: formData.get('kind'),
    itemId: formData.get('itemId'),
    status: formData.get('status'),
  })

  if (!parsed.success) employeeRedirect('error', 'invalid_work_update', 'operations')

  const allowedStatuses: readonly string[] = workStatusByKind[parsed.data.kind]
  if (!allowedStatuses.includes(parsed.data.status)) {
    employeeRedirect('error', 'invalid_work_update', 'operations')
  }

  let itemId: string | null = null
  let failure: string | null = null

  try {
    const { supabase, user, employee } = await getEmployeeContext()
    const table = tableByKind[parsed.data.kind]
    const { data: existing, error: existingError } = await supabase
      .from(table)
      .select('id,status,assigned_employee_id,property_id')
      .eq('id', parsed.data.itemId)
      .eq('assigned_employee_id', employee.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Assigned work item not found.')

    const updates: Record<string, string | null> = { status: parsed.data.status }
    if (parsed.data.kind === 'inspection' && parsed.data.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', existing.id)
      .eq('assigned_employee_id', employee.id)

    if (error) throw error
    itemId = existing.id

    await recordAuditLog({
      actorId: user.id,
      action: `employee.${parsed.data.kind}.updated`,
      entityType: table,
      entityId: existing.id,
      metadata: {
        previous_status: existing.status,
        status: parsed.data.status,
        assigned_employee_id: employee.id,
        property_id: existing.property_id,
      },
    })
  } catch (error) {
    console.error('Employee work update failed:', error)
    failure = 'work_update_failed'
  }

  if (failure || !itemId) employeeRedirect('error', failure ?? 'work_update_failed', 'operations')

  revalidatePath('/employee')
  revalidatePath('/admin/dashboard/employees')
  employeeRedirect('success', 'work_updated', 'operations')
}
