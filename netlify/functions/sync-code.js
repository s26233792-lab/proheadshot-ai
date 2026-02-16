const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * 重试同步单个验证码
 * 检查验证码是否存在，存在则更新为已同步状态
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { code } = JSON.parse(event.body || '{}');

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '请提供验证码' }) };
    }

    // 检查验证码是否存在
    const { data: existing, error: checkError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (checkError) {
      console.error('检查验证码失败:', checkError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '检查验证码失败' }) };
    }

    if (existing) {
      // 验证码已存在，更新为已同步状态
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({
          sync_status: 'synced',
          sync_error: null,
          last_sync_at: new Date().toISOString()
        })
        .eq('code', code);

      if (updateError) {
        console.error('更新同步状态失败:', updateError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: '更新同步状态失败' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '同步成功', sync_status: 'synced' })
      };
    } else {
      // 验证码不存在
      return { statusCode: 404, headers, body: JSON.stringify({ error: '验证码不存在', sync_status: 'failed' }) };
    }
  } catch (error) {
    console.error('重试同步失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '重试同步失败: ' + error.message }) };
  }
};
