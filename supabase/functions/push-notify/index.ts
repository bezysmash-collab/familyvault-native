/**
 * push-notify — Supabase Edge Function
 *
 * Triggered by Database Webhooks on INSERT/UPDATE to:
 *   posts, reactions, comments, tasks
 *
 * Each webhook POST body has: { type, table, record, old_record }
 *
 * Deploy: supabase functions deploy push-notify
 *
 * Required secrets (set via: supabase secrets set KEY=value):
 *   APNS_KEY_ID        – from Apple Developer portal
 *   APNS_TEAM_ID       – your Apple Developer team ID
 *   APNS_BUNDLE_ID     – com.app.familyvault
 *   APNS_PRIVATE_KEY   – contents of the .p8 file (with literal \n newlines)
 *   WEBHOOK_SECRET     – shared HMAC secret; set in Supabase webhook "Signing Secret" field
 *   SUPABASE_SERVICE_ROLE_KEY – set automatically by Supabase
 *   SUPABASE_URL              – set automatically by Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// APNs JWT is valid for 1 hour; cache it in module scope across invocations
let cachedJwt: string | null = null
let jwtCreatedAt = 0

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (!secret) return true // dev: skip verification when secret not set
  const sig = req.headers.get('x-webhook-signature') ?? ''
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = 'sha256=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return sig === expected
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text()
    if (!await verifySignature(req, rawBody)) {
      return new Response('Unauthorized', { status: 401 })
    }
    const body = JSON.parse(rawBody)
    const { type, table, record, old_record } = body

    const notifications = await buildNotifications(type, table, record, old_record)

    await Promise.all(
      notifications.map(({ userId, prefKey, title, body, data }) =>
        sendToUser(userId, prefKey, title, body, data)
      )
    )

    return new Response(JSON.stringify({ sent: notifications.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('push-notify error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// ─── Event → notification mapping ────────────────────────────────────────────

async function buildNotifications(
  type: string, table: string, record: any, _old: any
): Promise<{ userId: string; prefKey: string; title: string; body: string; data: Record<string, string> }[]> {
  const out: any[] = []

  // New post → notify all other family members
  if (table === 'posts' && type === 'INSERT') {
    const { data: profiles } = await supabase
      .from('profiles').select('id').neq('id', record.author_id)
    const { data: author } = await supabase
      .from('profiles').select('name').eq('id', record.author_id).single()

    for (const { id } of profiles ?? []) {
      out.push({
        userId:  id,
        prefKey: 'new_post',
        title:   `${author?.name} shared a post`,
        body:    record.content?.slice(0, 100) ?? '',
        data:    { screen: 'feed', postId: record.id },
      })
    }
  }

  // New reaction → notify post author
  if (table === 'reactions' && type === 'INSERT') {
    const { data: post } = await supabase
      .from('posts').select('author_id, content').eq('id', record.post_id).single()
    if (post && post.author_id !== record.user_id) {
      const { data: reactor } = await supabase
        .from('profiles').select('name').eq('id', record.user_id).single()
      const verb = record.type === 'love' ? 'loved' : record.type === 'like' ? 'liked' : 'reacted to'
      out.push({
        userId:  post.author_id,
        prefKey: 'reaction_on_post',
        title:   `${reactor?.name} ${verb} your post`,
        body:    post.content?.slice(0, 80) ?? '',
        data:    { screen: 'feed', postId: record.post_id },
      })
    }
  }

  // New comment → notify post author
  if (table === 'comments' && type === 'INSERT') {
    const { data: post } = await supabase
      .from('posts').select('author_id').eq('id', record.post_id).single()
    if (post && post.author_id !== record.author_id) {
      const { data: commenter } = await supabase
        .from('profiles').select('name').eq('id', record.author_id).single()
      out.push({
        userId:  post.author_id,
        prefKey: 'comment_on_post',
        title:   `${commenter?.name} commented on your post`,
        body:    record.content?.slice(0, 100) ?? '',
        data:    { screen: 'feed', postId: record.post_id },
      })
    }
  }

  // Task assigned → notify assignee
  if (table === 'tasks' && type === 'INSERT' && record.assigned_to && record.assigned_to !== record.created_by) {
    const { data: creator } = await supabase
      .from('profiles').select('name').eq('id', record.created_by).single()
    out.push({
      userId:  record.assigned_to,
      prefKey: 'task_assigned',
      title:   `${creator?.name} assigned you a task`,
      body:    record.title,
      data:    { screen: 'tasks' },
    })
  }

  // Task completed → notify task creator
  if (table === 'tasks' && type === 'UPDATE' && record.done && !_old?.done) {
    if (record.created_by !== record.assigned_to) {
      const { data: assignee } = await supabase
        .from('profiles').select('name').eq('id', record.assigned_to).single()
      out.push({
        userId:  record.created_by,
        prefKey: 'task_completed',
        title:   `${assignee?.name ?? 'Someone'} completed a task`,
        body:    record.title,
        data:    { screen: 'tasks' },
      })
    }
  }

  return out
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

async function sendToUser(
  userId: string, prefKey: string, title: string, body: string, data: Record<string, string>
) {
  // Check this user's notification preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select(prefKey)
    .eq('user_id', userId)
    .single()
  if (!prefs?.[prefKey]) return // user opted out

  // Get all device tokens for this user
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)
  if (!tokens?.length) return

  const jwt = await getApnsJwt()

  await Promise.all(
    tokens.map(({ token }) =>
      fetch(`https://api.push.apple.com/3/device/${token}`, {
        method: 'POST',
        headers: {
          authorization:    `bearer ${jwt}`,
          'apns-topic':     Deno.env.get('APNS_BUNDLE_ID')!,
          'apns-push-type': 'alert',
          'content-type':   'application/json',
        },
        body: JSON.stringify({
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
          },
          ...data,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          console.error(`APNs error for token ${token.slice(0, 8)}…:`, res.status, text)
          // Remove invalid tokens (APNs returns 410 Gone for unregistered tokens)
          if (res.status === 410) {
            await supabase.from('device_tokens').delete().eq('token', token)
          }
        }
      })
    )
  )
}

// ─── APNs JWT (cached for up to 55 minutes) ──────────────────────────────────

async function getApnsJwt(): Promise<string> {
  const now = Date.now()
  if (cachedJwt && now - jwtCreatedAt < 55 * 60 * 1000) return cachedJwt

  const rawKey = Deno.env.get('APNS_PRIVATE_KEY')!.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(rawKey, 'ES256')

  cachedJwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: Deno.env.get('APNS_KEY_ID') })
    .setIssuer(Deno.env.get('APNS_TEAM_ID')!)
    .setIssuedAt()
    .sign(privateKey)

  jwtCreatedAt = now
  return cachedJwt
}
