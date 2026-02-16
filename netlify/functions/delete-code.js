const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 支持 POST 和 DELETE 方法
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // 获取验证码（从 body 或 query 参数）
    let code;
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      code = body.code;
    } else {
      const params = event.queryStringParameters || {};
      code = params.code;
    }

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '请提供验证码' }) };
    }

    const cleanCode = code.trim().toUpperCase();

    // 删除验证码
    const { error } = await supabase
      .from('verification_codes')
      .delete()
      .eq('code', cleanCode);

    if (error) {
      console.error('删除验证码失败:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '删除失败' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `验证码 ${cleanCode} 已删除` })
    };

  } catch (error) {
    console.error('删除失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '删除失败' }) };
  }
};
