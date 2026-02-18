const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Only initialize Supabase if not in local mode
const isLocalMode = process.env.LOCAL_MODE === 'true';

let supabase = null;
let supabaseAnon = null;

if (!isLocalMode) {
  supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  supabaseAnon = createClient(
    config.supabase.url,
    config.supabase.anonKey
  );
}

module.exports = { supabase, supabaseAnon };
