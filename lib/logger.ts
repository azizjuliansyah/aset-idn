import { createClient, createAdminClient } from './supabase/server'
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
  | 'STOCK_OPNAME_GROUP'
  | 'STOCK_OPNAME_DIFF_CATEGORY'

interface ActivityLogParams {
  action: LogAction
  entityType: LogEntityType
  entityId?: string
  details?: any
  isSystem?: boolean
}

/**
 * Record an activity log in the database.
 * This should be called from Server Components or Server Actions.
 */
export async function createActivityLog({
  action,
  entityType,
  entityId,
  details,
  isSystem = false
}: ActivityLogParams) {
  try {
    let supabase
    let userId = null

    if (isSystem) {
      supabase = createAdminClient()
    } else {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.warn('[Logger] No user session found, skipping log.')
        return
      }
      userId = user.id
    }

    let ipAddress = null
    let userAgent = null
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
      userAgent = headersList.get('user-agent')
    } catch (e) {
      // safe catch for non-request contexts or static compilation
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
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

