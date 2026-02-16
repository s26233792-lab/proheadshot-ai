const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { code, deviceId } = JSON.parse(event.body || '{}');

      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '请输入验证码' }) };
      }

      const cleanCode = code.trim().toUpperCase();

      const { data: codeData, error: queryError } = await supabase
        .from('verification_codes')
        .select('points, status')
        .eq('code', cleanCode)
        .single();

      if (queryError || !codeData) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: '验证码不存在' }) };
      }

      if (codeData.status !== 'active') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '验证码已使用' }) };
      }

      const points = codeData.points;

      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('code', cleanCode);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({ code: cleanCode, points, device_id: deviceId });

      if (logError) console.error('记录日志失败:', logError);

      if (deviceId) {
        const { data: existingCredit } = await supabase
          .from('user_credits')
          .select('credits')
          .eq('device_id', deviceId)
          .single();

        if (existingCredit) {
          await supabase
            .from('user_credits')
            .update({ credits: existingCredit.credits + points, updated_at: new Date().toISOString() })
            .eq('device_id', deviceId);
        } else {
          await supabase
            .from('user_credits')
            .insert({ device_id: deviceId, credits: points });
        }
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, points, message: `验证成功，+${points} 点数` })
      };

    } catch (error) {
      console.error('验证失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '验证失败，请稍后重试' }) };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const code = params.code;

      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '请提供验证码' }) };
      }

      const cleanCode = code.trim().toUpperCase();

      const { data, error } = await supabase
        .from('verification_codes')
        .select('status, points, created_at')
        .eq('code', cleanCode)
        .single();

      if (error || !data) {
        return { statusCode: 404, headers, body: JSON.stringify({ exists: false }) };
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ exists: true, status: data.status, points: data.points })
      };

    } catch (error) {
      console.error('查询失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '查询失败' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
