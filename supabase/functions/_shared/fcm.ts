import { log } from './logger.ts';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const keyBuf = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuf,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  androidChannel: string;
  iosSound: string;
}

export async function sendFcmMessage(msg: FcmMessage): Promise<{ messageId?: string; error?: string }> {
  const saJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!saJson) throw new Error('FCM_SERVICE_ACCOUNT_JSON not set');

  const sa: ServiceAccount = JSON.parse(
    saJson.startsWith('{') ? saJson : new TextDecoder().decode(
      Uint8Array.from(atob(saJson), (c) => c.charCodeAt(0)),
    ),
  );

  const accessToken = await getAccessToken(sa);

  const fcmPayload = {
    message: {
      token: msg.token,
      notification: { title: msg.title, body: msg.body },
      data: msg.data ?? {},
      android: {
        priority: 'high',
        notification: { channel_id: msg.androidChannel, sound: 'default' },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: msg.iosSound } },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(fcmPayload),
    },
  );

  const result = await res.json();
  if (!res.ok) {
    const errDetails = result?.error?.details ?? [];
    const isUnregistered = errDetails.some((d: { errorCode?: string }) => d.errorCode === 'UNREGISTERED');
    log('warn', 'FCM send failed', { status: res.status, result });
    return { error: isUnregistered ? 'UNREGISTERED' : JSON.stringify(result.error) };
  }

  return { messageId: result.name };
}
