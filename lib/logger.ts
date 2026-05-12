import { createClient } from './supabase/server'
import { headers } from 'next/headers'

export type LogAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'LOAN' 
  | 'RETURN' 
  | 'LOGIN'
  | 'RESTORE'
  | 'BULK_DELETE'
  | 'REMINDER'

export type LogEntityType = 
  | 'ITEM' 
  | 'LOAN_REQUEST' 
  | 'WAREHOUSE' 
  | 'STOCK_IN' 
  | 'STOCK_OUT' 
  | 'USER' 
  | 'SETTING'
  | 'ITEM_CATEGORY'
  | 'ITEM_STATUS'
  | 'ITEM_CONDITION'
  | 'STOCK_TRANSFER'

interface ActivityLogParams {
  action: LogAction
  entityType: LogEntityType
  entityId?: string
  details?: any
}

/**
 * Record an activity log in the database.
 * This should be called from Server Components or Server Actions.
 */
export async function createActivityLog({
  action,
  entityType,
  entityId,
  details
}: ActivityLogParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('[Logger] No user session found, skipping log.')
      return
    }

    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
    const userAgent = headersList.get('user-agent')

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    })

    if (error) {
      console.error('[Logger] Error inserting activity log:', error.message)
    }
  } catch (err) {
    console.error('[Logger] Unexpected error:', err)
  }
}
