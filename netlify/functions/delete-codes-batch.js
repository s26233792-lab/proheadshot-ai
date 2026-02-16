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
    const { codes, deleteType } = JSON.parse(event.body || '{}');

    // 如果提供了 codes 数组，直接删除指定的验证码
    if (codes && Array.isArray(codes) && codes.length > 0) {
      const cleanCodes = codes.map(c => c.trim().toUpperCase());

      const { error } = await supabase
        .from('verification_codes')
        .delete()
        .in('code', cleanCodes);

      if (error) {
        console.error('批量删除失败:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: '批量删除失败' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `已删除 ${cleanCodes.length} 张验证码`, deleted: cleanCodes.length })
      };
    }

    // 按类型批量删除
    if (deleteType) {
      let query = supabase.from('verification_codes');

      switch (deleteType) {
        case 'used':
          query = query.eq('status', 'used');
          break;
        case 'active':
          query = query.eq('status', 'active');
          break;
        case 'failed':
          query = query.eq('sync_status', 'failed');
          break;
        case 'all':
          // 删除所有
          break;
        default:
          return { statusCode: 400, headers, body: JSON.stringify({ error: '无效的删除类型' }) };
      }

      const { error } = await query.delete();

      if (error) {
        console.error('按类型删除失败:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: '按类型删除失败' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `已按 ${deleteType} 类型删除验证码` })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: '请提供验证码或删除类型' }) };

  } catch (error) {
    console.error('批量删除失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '批量删除失败' }) };
  }
};
