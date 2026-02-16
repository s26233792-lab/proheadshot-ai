const { supabase } = require('./supabase-client');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { data: statsData, error: statsError } = await supabase
      .from('verification_codes')
      .select('status, points');

    if (statsError) throw statsError;

    const stats = {
      total: statsData.length,
      active: statsData.filter(d => d.status === 'active').length,
      used: statsData.filter(d => d.status === 'used').length,
      total_points: statsData.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.points || 0), 0)
    };

    const today = new Date().toISOString().split('T')[0];
    const { data: todayData, error: todayError } = await supabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', today);

    if (todayError) throw todayError;

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ stats, today: { today_used: todayData ? todayData.length : 0 } })
    };

  } catch (error) {
    console.error('获取统计失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '获取失败' }) };
  }
};
