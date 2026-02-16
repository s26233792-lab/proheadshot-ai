const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { codes } = JSON.parse(event.body || '{}');

    if (!codes || typeof codes !== 'object') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '请提供 codes 对象' }) };
    }

    const results = { success: 0, skipped: 0, errors: [] };

    for (const [code, info] of Object.entries(codes)) {
      const { data: existing } = await supabase
        .from('verification_codes')
        .select('code')
        .eq('code', code)
        .single();

      if (existing) {
        results.skipped++;
        continue;
      }

      const { error } = await supabase
        .from('verification_codes')
        .insert({
          code,
          points: info.points || 1,
          status: info.status || 'active',
          created_at: info.createdAt || new Date().toISOString()
        });

      if (error) {
        results.errors.push({ code, error: error.message });
      } else {
        results.success++;
      }
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, message: `导入完成：成功 ${results.success}，跳过 ${results.skipped}，失败 ${results.errors.length}`, results })
    };

  } catch (error) {
    console.error('导入失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '导入失败，请稍后重试' }) };
  }
};
