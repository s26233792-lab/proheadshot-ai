/**
 * 统计数据 API
 */

const { supabase } = require('./supabase-client.js');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取验证码统计
    const { data: statsData, error: statsError } = await supabase
      .from('verification_codes')
      .select('status, points');

    if (statsError) throw statsError;

    // 手动计算统计数据
    const stats = {
      total: statsData.length,
      active: statsData.filter(d => d.status === 'active').length,
      used: statsData.filter(d => d.status === 'used').length,
      total_points: statsData.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.points || 0), 0)
    };

    // 获取今日使用统计
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData, error: todayError } = await supabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', today);

    if (todayError) throw todayError;

    return res.json({
      stats,
      today: {
        today_used: todayData ? todayData.length : 0
      }
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ error: '获取失败' });
  }
};
