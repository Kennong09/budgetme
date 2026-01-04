import { supabase, supabaseAdmin } from './supabaseClient';

/**
 * Get the appropriate Supabase client based on user authentication status
 * @param {string | null} userId - The user ID or null for anonymous users
 * @returns {Object} The appropriate Supabase client
 */
function getSupabaseClient(userId) {
  // Always use regular client - RLS policies now support anonymous users
  return supabase;
}

/**
 * Create a new chat session
 * @param {Object} sessionData - The session data
 * @returns {Promise<Object>} The created session
 */
export async function createChatSession(sessionData) {
  const client = getSupabaseClient(sessionData.user_id);
  
  const { data, error } = await client
    .from('chat_sessions')
    .insert([sessionData])
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Get an active session for a user
 * @param {string | null} userId - The user ID (null for anonymous users)
 * @returns {Promise<Object|null>} The active session or null
 */
export async function getActiveSession(userId) {
  const client = getSupabaseClient(userId);
  
  let query = client
    .from('chat_sessions')
    .select('id, message_count')
    .eq('is_active', true)
    .order('start_time', { ascending: false })
    .limit(1);
  
  // Handle NULL user_id (anonymous users) differently
  if (userId === null) {
    query = query.is('user_id', null);
  } else {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.single();
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - that's okay
    throw error;
  }
  
  return data;
}

/**
 * Update a chat session
 * @param {string} sessionId - The session ID
 * @param {string} userId - The user ID
 * @param {Object} updates - The updates to apply
 * @returns {Promise<void>}
 */
export async function updateChatSession(sessionId, userId, updates) {
  const client = getSupabaseClient(userId);
  
  const { error } = await client
    .from('chat_sessions')
    .update(updates)
    .eq('id', sessionId);
  
  if (error) {
    throw error;
  }
}

/**
 * Insert a chat message
 * @param {Object} messageData - The message data
 * @returns {Promise<Object>} The created message
 */
export async function insertChatMessage(messageData) {
  const client = getSupabaseClient(messageData.user_id);
  
  const { data, error } = await client
    .from('chat_messages')
    .insert([messageData])
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Insert AI response analytics
 * @param {Object} analyticsData - The analytics data
 * @param {string} userId - The user ID (for determining client)
 * @returns {Promise<void>}
 */
export async function insertAnalytics(analyticsData, userId) {
  const client = getSupabaseClient(userId);
  
  const { error } = await client
    .from('ai_response_analytics')
    .insert([analyticsData]);
  
  if (error) {
    throw error;
  }
}

/**
 * Check if anonymous user record exists (no longer needed, kept for compatibility)
 * @returns {Promise<void>}
 */
export async function ensureAnonymousUser() {
  // No-op: Anonymous users are now handled with NULL user_id
  return Promise.resolve();
}

