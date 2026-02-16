/**
 * Supabase 客户端初始化
 * 用于服务端 API 调用
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

module.exports = { supabase: createClient(supabaseUrl, supabaseKey) };
