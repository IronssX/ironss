import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-video-purge-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

interface CleanupItem {
  id: number;
  video_id: string;
  owner_id: string;
  object_path: string;
  attempts: number;
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');
  if (origin && allowedOrigins.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let mismatch = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function encodeObjectPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function getRequiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

async function purgeObjectCache(
  projectUrl: string,
  objectPath: string,
  purgeKey: string,
  legacyServiceKey: string,
): Promise<void> {
  const response = await fetch(
    `${projectUrl}/storage/v1/cdn/videos/${encodeObjectPath(objectPath)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: purgeKey,
        Authorization: `Bearer ${legacyServiceKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`CDN purge failed with HTTP ${response.status}.`);
}

async function purgeEntireVideoBucket(
  projectUrl: string,
  purgeKey: string,
  legacyServiceKey: string,
): Promise<void> {
  const response = await fetch(`${projectUrl}/storage/v1/cdn/videos`, {
    method: 'DELETE',
    headers: {
      apikey: purgeKey,
      Authorization: `Bearer ${legacyServiceKey}`,
    },
  });
  if (!response.ok) throw new Error(`Bucket CDN purge failed with HTTP ${response.status}.`);
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set(
    (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(403, { error: 'Origin is not allowed.' }, null, allowedOrigins);
  }
  if (request.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 204 });
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin },
    });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' }, origin, allowedOrigins);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse(400, { error: 'Invalid request body.' }, origin, allowedOrigins);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' }, origin, allowedOrigins);
  }

  let projectUrl: string;
  let serviceKey: string;
  let purgeKey: string;
  try {
    projectUrl = getRequiredEnvironment('SUPABASE_URL').replace(/\/+$/, '');
    serviceKey = getRequiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
    purgeKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? serviceKey;
  } catch (error) {
    console.error('[video-storage-operations] Server configuration is incomplete.', error);
    return jsonResponse(500, { error: 'Storage operations are not configured.' }, origin, allowedOrigins);
  }

  if (body.action === 'purge-legacy-public-cache') {
    const expectedToken = Deno.env.get('VIDEO_CACHE_PURGE_TOKEN');
    const providedToken = request.headers.get('x-video-purge-token');
    if (!expectedToken || !providedToken || !constantTimeEqual(expectedToken, providedToken)) {
      return jsonResponse(401, { error: 'Unauthorized.' }, origin, allowedOrigins);
    }
    try {
      await purgeEntireVideoBucket(projectUrl, purgeKey, serviceKey);
      return jsonResponse(200, { purged: true }, origin, allowedOrigins);
    } catch (error) {
      console.error('[video-storage-operations] Bucket CDN purge failed.', error);
      return jsonResponse(502, { error: 'CDN cache purge failed.' }, origin, allowedOrigins);
    }
  }

  const processAllOwnerCleanup = body.action === 'process-my-video-cleanup';
  const videoId = typeof body.videoId === 'string' ? body.videoId : null;
  if (!processAllOwnerCleanup && (body.action !== 'process-video-cleanup' || !videoId)) {
    return jsonResponse(400, { error: 'Unsupported storage operation.' }, origin, allowedOrigins);
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonResponse(401, { error: 'Authentication required.' }, origin, allowedOrigins);

  let userClient;
  let adminClient;
  try {
    const anonKey = getRequiredEnvironment('SUPABASE_ANON_KEY');
    userClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    adminClient = createClient(projectUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (error) {
    console.error('[video-storage-operations] Supabase client initialization failed.', error);
    return jsonResponse(500, { error: 'Storage operations are not configured.' }, origin, allowedOrigins);
  }

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse(401, { error: 'Authentication required.' }, origin, allowedOrigins);

  let queueQuery = adminClient
    .from('video_storage_cleanup_queue')
    .select('id, video_id, owner_id, object_path, attempts')
    .eq('owner_id', userData.user.id)
    .is('completed_at', null);
  if (!processAllOwnerCleanup && videoId) {
    queueQuery = queueQuery.eq('video_id', videoId);
  }
  const { data: pendingItems, error: queryError } = await queueQuery
    .order('id', { ascending: true })
    .limit(50);

  if (queryError) {
    console.error('[video-storage-operations] Cleanup queue query failed.', queryError);
    return jsonResponse(500, { error: 'Pending file cleanup could not be loaded.' }, origin, allowedOrigins);
  }

  const failures: number[] = [];
  for (const rawItem of pendingItems ?? []) {
    const item = rawItem as CleanupItem;
    try {
      if (!item.object_path.startsWith(`${userData.user.id}/`)) {
        throw new Error('Queued object path does not match the video owner.');
      }

      await purgeObjectCache(projectUrl, item.object_path, purgeKey, serviceKey);
      const { error: removeError } = await adminClient.storage.from('videos').remove([item.object_path]);
      if (removeError) throw removeError;

      const { error: completeError } = await adminClient
        .from('video_storage_cleanup_queue')
        .update({
          attempts: item.attempts,
          last_error: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('owner_id', userData.user.id)
        .is('completed_at', null);
      if (completeError) throw completeError;
    } catch (error) {
      failures.push(item.id);
      const { error: updateError } = await adminClient
        .from('video_storage_cleanup_queue')
        .update({
          attempts: item.attempts + 1,
          last_error: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown cleanup failure.',
        })
        .eq('id', item.id)
        .eq('owner_id', userData.user.id)
        .is('completed_at', null);
      if (updateError) {
        console.error('[video-storage-operations] Cleanup failure could not be recorded.', updateError);
      }
      console.error('[video-storage-operations] A queued file could not be purged and removed.', error);
    }
  }

  if (failures.length > 0) {
    return jsonResponse(
      503,
      { cleanupComplete: false, pendingItems: failures.length },
      origin,
      allowedOrigins,
    );
  }

  let remainingQuery = adminClient
    .from('video_storage_cleanup_queue')
    .select('id')
    .eq('owner_id', userData.user.id)
    .is('completed_at', null);
  if (!processAllOwnerCleanup && videoId) {
    remainingQuery = remainingQuery.eq('video_id', videoId);
  }
  const { data: remainingItems, error: remainingError } = await remainingQuery.limit(1);
  if (remainingError) {
    console.error('[video-storage-operations] Remaining cleanup items could not be checked.', remainingError);
    return jsonResponse(503, { cleanupComplete: false }, origin, allowedOrigins);
  }
  if (remainingItems?.length) {
    return jsonResponse(200, {
      cleanupComplete: false,
      morePending: true,
      processedItems: pendingItems?.length ?? 0,
    }, origin, allowedOrigins);
  }

  let transitionQuery = userClient
    .from('videos')
    .select('id')
    .eq('owner_id', userData.user.id)
    .eq('visibility', 'public')
    .eq('privacy_transition_pending', true);
  if (!processAllOwnerCleanup && videoId) {
    transitionQuery = transitionQuery.eq('id', videoId);
  }
  const { data: pendingTransitions, error: transitionQueryError } = await transitionQuery;
  if (transitionQueryError) {
    console.error('[video-storage-operations] Pending privacy transitions could not be loaded.', transitionQueryError);
    return jsonResponse(503, { cleanupComplete: false }, origin, allowedOrigins);
  }

  for (const transition of pendingTransitions ?? []) {
    const { data: remainingItems, error: remainingError } = await adminClient
      .from('video_storage_cleanup_queue')
      .select('id')
      .eq('video_id', transition.id)
      .eq('owner_id', userData.user.id)
      .is('completed_at', null)
      .limit(1);
    if (remainingError) {
      console.error('[video-storage-operations] Remaining cleanup items could not be checked.', remainingError);
      return jsonResponse(503, { cleanupComplete: false }, origin, allowedOrigins);
    }
    if (remainingItems?.length) continue;

    const { data: finalizedTransition, error: finalizeError } = await userClient
      .from('videos')
      .update({ visibility: 'private', privacy_transition_pending: false })
      .eq('id', transition.id)
      .eq('owner_id', userData.user.id)
      .eq('visibility', 'public')
      .eq('privacy_transition_pending', true)
      .select('id')
      .maybeSingle();
    if (finalizeError) {
      console.error('[video-storage-operations] A privacy transition could not be finalized.', finalizeError);
      return jsonResponse(503, { cleanupComplete: false }, origin, allowedOrigins);
    }
    if (!finalizedTransition) {
      const { data: currentVideo, error: currentVideoError } = await userClient
        .from('videos')
        .select('id')
        .eq('id', transition.id)
        .eq('owner_id', userData.user.id)
        .eq('visibility', 'private')
        .eq('privacy_transition_pending', false)
        .maybeSingle();
      if (currentVideoError || !currentVideo) {
        console.error('[video-storage-operations] A concurrent privacy transition could not be verified.', currentVideoError);
        return jsonResponse(503, { cleanupComplete: false }, origin, allowedOrigins);
      }
    }
  }

  return jsonResponse(200, { cleanupComplete: true, processedItems: pendingItems?.length ?? 0 }, origin, allowedOrigins);
});
