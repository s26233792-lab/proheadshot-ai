const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function generateCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { points = 1, amount = 1, codeLength = 8 } = JSON.parse(event.body || '{}');

      if (amount < 1 || amount > 1000) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '生成数量必须在 1-1000 之间' }) };
      }

      const generatedCodes = [];

      for (let i = 0; i < amount; i++) {
        let code;
        let exists = true;
        let attempts = 0;

        while (exists && attempts < 100) {
          code = generateCode(codeLength);
          const { data } = await supabase
            .from('verification_codes')
            .select('code')
            .eq('code', code)
            .single();

          exists = !!data;
          attempts++;
        }

        const { data, error } = await supabase
          .from('verification_codes')
          .insert({ code, points, status: 'active' })
          .select()
          .single();

        if (error) {
          console.error('插入验证码失败:', error);
          continue;
        }

        generatedCodes.push({ code, points, status: 'active' });
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, codes: generatedCodes, count: generatedCodes.length, message: `已生成 ${generatedCodes.length} 张验证码` })
      };

    } catch (error) {
      console.error('生成失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '生成失败，请稍后重试' }) };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const status = params.status || 'all';
      const limit = parseInt(params.limit) || 100;
      const offset = parseInt(params.offset) || 0;

      let query = supabase
        .from('verification_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status !== 'all') {
        query = supabase
          .from('verification_codes')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: '获取失败' }) };
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ codes: data || [], count: data ? data.length : 0 })
      };

    } catch (error) {
      console.error('获取列表失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '获取失败' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
