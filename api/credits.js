/**
 * 用户积分 API
 */

import pg from 'pg';
const { Pool } = pg;

// 生成设备ID
function getDeviceId(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
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

// 获取用户积分
export async function GET(request) {
  try {
    const deviceId = getDeviceId(request);
    const POSTGRES_URL = process.env.POSTGRES_URL;

    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    const result = await pool.query(
      'SELECT credits FROM user_credits WHERE device_id = $1',
      [deviceId]
    );

    await pool.end();

    const credits = result.rows.length > 0 ? result.rows[0].credits : 0;

    return Response.json({
      deviceId,
      credits
    });

  } catch (error) {
    console.error('获取积分失败:', error);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}

// 消费积分
export async function POST(request) {
  try {
    const body = await request.json();
    const { amount = 1 } = body;
    const deviceId = getDeviceId(request);

    if (amount < 1) {
      return Response.json({ error: '消费数量必须大于0' }, { status: 400 });
    }

    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      return Response.json({ error: '数据库未配置' }, { status: 500 });
    }

    const pool = new Pool({ connectionString: POSTGRES_URL });

    try {
      await pool.query('BEGIN');

      // 检查积分
      const checkResult = await pool.query(
        'SELECT credits FROM user_credits WHERE device_id = $1 FOR UPDATE',
        [deviceId]
      );

      if (checkResult.rows.length === 0 || checkResult.rows[0].credits < amount) {
        await pool.query('ROLLBACK');
        await pool.end();
        return Response.json({ error: '积分不足' }, { status: 400 });
      }

      // 扣除积分
      await pool.query(
        'UPDATE user_credits SET credits = credits - $1, updated_at = NOW() WHERE device_id = $2',
        [amount, deviceId]
      );

      await pool.query('COMMIT');

      const newCredits = checkResult.rows[0].credits - amount;

      await pool.end();

      return Response.json({
        success: true,
        deducted: amount,
        remaining: newCredits
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      await pool.end();
      throw error;
    }

  } catch (error) {
    console.error('消费积分失败:', error);
    return Response.json({ error: '消费失败' }, { status: 500 });
  }
}
