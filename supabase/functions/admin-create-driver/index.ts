import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is admin or dispatcher
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['admin', 'dispatcher'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as {
      full_name: string
      phone?: string
      email?: string
      vehicle_id?: string
      new_vehicle?: {
        plate: string
        make?: string
        model?: string
        color?: string
        year?: number
        vehicle_type?: string
      }
      activate_immediately?: boolean
    }

    // Generate temp password
    const tempPassword = crypto.randomUUID() + 'Aa1!'

    // Create auth user
    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email || `driver_${Date.now()}@remis.internal`,
      phone: body.phone || undefined,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, role: 'driver' },
    })
    if (createErr) throw new Error(createErr.message)
    const newUserId = authData.user.id

    // Update profile (created by handle_new_user trigger)
    await supabaseAdmin.from('profiles').update({
      full_name: body.full_name,
      phone: body.phone || null,
      email: body.email || null,
      role: 'driver',
    }).eq('id', newUserId)

    // Create new vehicle if needed
    let vehicleId: string | null = body.vehicle_id ?? null
    if (body.new_vehicle) {
      const { data: veh, error: vehErr } = await supabaseAdmin
        .from('vehicles')
        .insert({
          plate: body.new_vehicle.plate.toUpperCase(),
          make: body.new_vehicle.make || null,
          model: body.new_vehicle.model || null,
          color: body.new_vehicle.color || null,
          year: body.new_vehicle.year || null,
          vehicle_type: body.new_vehicle.vehicle_type || 'sedan',
          is_active: true,
        })
        .select('id')
        .single()
      if (vehErr) throw new Error(vehErr.message)
      vehicleId = veh.id
    }

    // Create driver record
    const { data: driver, error: driverErr } = await supabaseAdmin
      .from('drivers')
      .insert({
        id: newUserId,
        vehicle_id: vehicleId,
        is_active: body.activate_immediately !== false,
        current_status: 'offline',
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (driverErr) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw new Error(driverErr.message)
    }

    return new Response(JSON.stringify({ driver_id: driver.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
