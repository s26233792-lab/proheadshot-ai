const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function getDeviceId(event) {
  const userAgent = (event.headers || {})['user-agent'] || '';
  const ip = (event.headers || {})['x-forwarded-for'] ||
            (event.headers || {})['x-real-ip'] ||
            'unknown';

  const str = userAgent + ip;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const deviceId = getDeviceId(event);

      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      const credits = data ? data.credits : 0;

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ deviceId, credits })
      };

    } catch (error) {
      console.error('获取积分失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '获取失败' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { amount = 1 } = JSON.parse(event.body || '{}');
      const deviceId = getDeviceId(event);

      if (amount < 1) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '消费数量必须大于0' }) };
      }

      const { data: creditData, error: queryError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      if (queryError || !creditData || creditData.credits < amount) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '积分不足' }) };
      }

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: creditData.credits - amount, updated_at: new Date().toISOString() })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, deducted: amount, remaining: creditData.credits - amount })
      };

    } catch (error) {
      console.error('消费积分失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '消费失败' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
