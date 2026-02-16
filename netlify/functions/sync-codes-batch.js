const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

/**
 * 批量同步验证码
 * 支持两种模式：
 * - failed: 只同步失败的验证码
 * - all: 同步所有验证码（将它们标记为已同步）
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { syncType = 'failed' } = JSON.parse(event.body || '{}');

    // 构建查询条件
    let query = supabase.from('verification_codes');

    if (syncType === 'failed') {
      // 只同步失败的验证码
      query = query.select('code').eq('sync_status', 'failed');
    } else if (syncType === 'all') {
      // 同步所有验证码（实际上是检查它们是否存在，存在就标记为已同步）
      query = query.select('code').not('sync_status', 'eq', 'synced');
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '无效的同步类型' }) };
    }

    const { data: codes, error: queryError } = await query;

    if (queryError) {
      console.error('查询验证码失败:', queryError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: '查询验证码失败' }) };
    }

    if (!codes || codes.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '没有需要同步的验证码',
          synced: 0,
          failed: 0
        })
      };
    }

    // 批量更新同步状态
    const codesToUpdate = codes.map(c => c.code);
    let updateQuery = supabase
      .from('verification_codes')
      .update({
        sync_status: 'synced',
        sync_error: null,
        last_sync_at: new Date().toISOString()
      });

    if (syncType === 'failed') {
      updateQuery = updateQuery.eq('sync_status', 'failed');
    } else {
      // 对于 all 类型，只更新非 synced 的
      updateQuery = updateQuery.not('sync_status', 'eq', 'synced');
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('批量更新失败:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '批量更新失败',
          synced: 0,
          failed: codesToUpdate.length
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `已同步 ${codesToUpdate.length} 张验证码`,
        synced: codesToUpdate.length,
        failed: 0,
        codes: codesToUpdate
      })
    };

  } catch (error) {
    console.error('批量同步失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '批量同步失败: ' + error.message }) };
  }
};
