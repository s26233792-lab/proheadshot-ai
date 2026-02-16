/**
 * 生成验证码 API
 */

const { supabase } = require('./supabase-client.js');

function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

  if (req.method === 'POST') {
    try {
      const { points = 1, amount = 1, codeLength = 8 } = req.body;

      if (amount < 1 || amount > 1000) {
        return res.status(400).json({ error: '生成数量必须在 1-1000 之间' });
      }

      const generatedCodes = [];

      for (let i = 0; i < amount; i++) {
        let code;
        let exists = true;
        let attempts = 0;

        // 检查验证码是否已存在
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

        // 插入新验证码
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

      return res.json({
        success: true,
        codes: generatedCodes,
        count: generatedCodes.length,
        message: `已生成 ${generatedCodes.length} 张验证码`
      });

    } catch (error) {
      console.error('生成失败:', error);
      return res.status(500).json({ error: '生成失败，请稍后重试' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { status = 'all', limit = 100, offset = 0 } = req.query;

      let query = supabase
        .from('verification_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (status !== 'all') {
        query = supabase
          .from('verification_codes')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false })
          .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取列表失败:', error);
        return res.status(500).json({ error: '获取失败' });
      }

      return res.json({
        codes: data || [],
        count: data ? data.length : 0
      });

    } catch (error) {
      console.error('获取列表失败:', error);
      return res.status(500).json({ error: '获取失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
