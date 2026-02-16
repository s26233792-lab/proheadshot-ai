/**
 * 用户积分 API
 */

const { supabase } = require('./supabase-client.js');

function getDeviceId(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
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

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const deviceId = getDeviceId(req);

      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      const credits = data ? data.credits : 0;

      return res.json({
        deviceId,
        credits
      });

    } catch (error) {
      console.error('获取积分失败:', error);
      return res.status(500).json({ error: '获取失败' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { amount = 1 } = req.body;
      const deviceId = getDeviceId(req);

      if (amount < 1) {
        return res.status(400).json({ error: '消费数量必须大于0' });
      }

      // 获取当前积分
      const { data: creditData, error: queryError } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('device_id', deviceId)
        .single();

      if (queryError || !creditData || creditData.credits < amount) {
        return res.status(400).json({ error: '积分不足' });
      }

      // 扣除积分
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: creditData.credits - amount, updated_at: new Date().toISOString() })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;

      return res.json({
        success: true,
        deducted: amount,
        remaining: creditData.credits - amount
      });

    } catch (error) {
      console.error('消费积分失败:', error);
      return res.status(500).json({ error: '消费失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
