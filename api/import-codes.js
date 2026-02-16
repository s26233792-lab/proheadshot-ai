/**
 * 导入验证码 API
 * 用于将本地 codes.json 数据导入 Supabase
 */

const { supabase } = require('./supabase-client.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codes } = req.body;

    if (!codes || typeof codes !== 'object') {
      return res.status(400).json({ error: '请提供 codes 对象' });
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

    return res.json({
      success: true,
      message: `导入完成：成功 ${results.success}，跳过 ${results.skipped}，失败 ${results.errors.length}`,
      results
    });

  } catch (error) {
    console.error('导入失败:', error);
    return res.status(500).json({ error: '导入失败，请稍后重试' });
  }
};
