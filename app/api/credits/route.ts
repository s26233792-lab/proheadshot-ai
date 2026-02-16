import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 生成设备ID（基于浏览器指纹，简化版）
function getDeviceId(request: NextRequest): string {
  // 从请求头获取一些信息作为设备指纹
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

  // 简单哈希生成设备ID
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
export async function GET(request: NextRequest) {
  try {
    const deviceId = getDeviceId(request);

    const result = await sql`
      SELECT credits FROM user_credits WHERE device_id = ${deviceId}
    `;

    const credits = result.rows.length > 0 ? result.rows[0].credits : 0;

    return NextResponse.json({
      deviceId,
      credits
    });

  } catch (error) {
    console.error('获取积分失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}

// 消费积分
export async function POST(request: NextRequest) {
  try {
    const { amount = 1 } = await request.json();
    const deviceId = getDeviceId(request);

    if (amount < 1) {
      return NextResponse.json(
        { error: '消费数量必须大于0' },
        { status: 400 }
      );
    }

    const client = await sql.connect();

    try {
      await client.query('BEGIN');

      // 检查积分是否足够
      const checkResult = await client.query(`
        SELECT credits FROM user_credits WHERE device_id = $1 FOR UPDATE
      `, [deviceId]);

      if (checkResult.rows.length === 0 || checkResult.rows[0].credits < amount) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: '积分不足' },
          { status: 400 }
        );
      }

      // 扣除积分
      await client.query(`
        UPDATE user_credits
        SET credits = credits - $1, updated_at = NOW()
        WHERE device_id = $2
      `, [amount, deviceId]);

      await client.query('COMMIT');

      const newCredits = checkResult.rows[0].credits - amount;

      return NextResponse.json({
        success: true,
        deducted: amount,
        remaining: newCredits
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('消费积分失败:', error);
    return NextResponse.json(
      { error: '消费失败' },
      { status: 500 }
    );
  }
}
