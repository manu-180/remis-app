import { createClient } from 'npm:@supabase/supabase-js@2';
import { initSentry, captureWithContext } from '../_shared/observability.ts';
import { log } from '../_shared/logger.ts';

initSentry();

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const TELEGRAM_CHAT_OWNER = Deno.env.get('TELEGRAM_CHAT_ID_OWNER') ?? '';
const TELEGRAM_CHAT_DISPATCHER = Deno.env.get('TELEGRAM_CHAT_ID_DISPATCHER') ?? '';

async function sendTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

    // 1. Heartbeat loss check
    const { data: onlineDrivers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'driver')
      .eq('is_online', true);

    const { data: recentHeartbeats } = await supabase
      .from('driver_heartbeats')
      .select('driver_id')
      .gte('created_at', twoMinAgo);

    const onlineCount = onlineDrivers?.length ?? 0;
    const heartbeatCount = new Set(recentHeartbeats?.map((h) => h.driver_id)).size;
    const lossRate = onlineCount > 0 ? (onlineCount - heartbeatCount) / onlineCount : 0;

    if (lossRate > 0.3 && onlineCount >= 2) {
      const msg = `⚠️ <b>Alerta: heartbeat loss</b>\nConductores online: ${onlineCount}\nSin señal: ${onlineCount - heartbeatCount} (${Math.round(lossRate * 100)}%)\n${now.toLocaleString('es-AR')}`;
      await sendTelegram(TELEGRAM_CHAT_OWNER, msg);
      await sendTelegram(TELEGRAM_CHAT_DISPATCHER, msg);
      log('warn', 'alert.heartbeat_loss', { onlineCount, heartbeatCount, lossRate });
    }

    // 2. Unassigned ride >10 min with available drivers
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const { data: stuckRides } = await supabase
      .from('rides')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', tenMinAgo);

    const { data: availableDrivers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'driver')
      .eq('is_online', true)
      .eq('on_trip', false);

    if ((stuckRides?.length ?? 0) > 0 && (availableDrivers?.length ?? 0) > 0) {
      const msg = `🚨 <b>Pedido sin asignar >10 min</b>\nPedidos pendientes: ${stuckRides!.length}\nConductores disponibles: ${availableDrivers!.length}\n${now.toLocaleString('es-AR')}`;
      await sendTelegram(TELEGRAM_CHAT_OWNER, msg);
      await sendTelegram(TELEGRAM_CHAT_DISPATCHER, msg);
      log('error', 'alert.stuck_rides', { stuckCount: stuckRides!.length, availableCount: availableDrivers!.length });
    }

    // 3. MP webhook errors in last hour
    const { count: mpErrors } = await supabase
      .from('payment_webhook_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('created_at', oneHourAgo);

    if ((mpErrors ?? 0) > 5) {
      const msg = `💳 <b>Errores MP webhook</b>\nErrores última hora: ${mpErrors}\n${now.toLocaleString('es-AR')}`;
      await sendTelegram(TELEGRAM_CHAT_OWNER, msg);
      log('error', 'alert.mp_webhook_errors', { count: mpErrors });
    }

    // 4. SOS events (immediate)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: sosEvents } = await supabase
      .from('sos_events')
      .select('id, ride_id, created_at')
      .gte('created_at', fiveMinAgo)
      .is('alerted_at', null);

    for (const sos of sosEvents ?? []) {
      const msg = `🆘 <b>SOS ACTIVADO</b>\nViaje: ${sos.ride_id}\nHora: ${new Date(sos.created_at).toLocaleString('es-AR')}\n⚠️ Seguir protocolo SOS inmediatamente`;
      await sendTelegram(TELEGRAM_CHAT_OWNER, msg);
      await sendTelegram(TELEGRAM_CHAT_DISPATCHER, msg);
      await supabase.from('sos_events').update({ alerted_at: now.toISOString() }).eq('id', sos.id);
      log('error', 'alert.sos_triggered', { rideId: sos.ride_id });
    }

    log('info', 'cron.alerts_monitor.ok', { lossRate, stuckRides: stuckRides?.length ?? 0 });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    captureWithContext(err, { function: 'cron-alerts-monitor' });
    log('error', 'cron.alerts_monitor.error', { error: String(err) });
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
