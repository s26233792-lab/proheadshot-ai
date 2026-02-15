import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 验证码验证接口
export async function POST(request: NextRequest) {
  try {
    const { code, deviceId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: '请输入验证码' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 使用事务确保原子性
    const client = await sql.connect();

    try {
      await client.query('BEGIN');

      // 查询验证码状态（加锁）
      const result = await client.query(`
        SELECT points, status
        FROM verification_codes
        WHERE code = $1
        FOR UPDATE
      `, [cleanCode]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: '验证码不存在' }, { status: 404 });
      }

      const codeData = result.rows[0];

      if (codeData.status !== 'active') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: '验证码已使用' }, { status: 400 });
      }

      const points = codeData.points;

      // 更新验证码状态为已使用
      await client.query(`
        UPDATE verification_codes
        SET status = 'used', used_at = NOW()
        WHERE code = $1
      `, [cleanCode]);

      // 记录使用日志
      await client.query(`
        INSERT INTO usage_logs (code, points, device_id)
        VALUES ($1, $2, $3)
      `, [cleanCode, points, deviceId || null]);

      // 更新用户积分（如果有 deviceId）
      if (deviceId) {
        await client.query(`
          INSERT INTO user_credits (device_id, credits)
          VALUES ($1, $2)
          ON CONFLICT (device_id)
          DO UPDATE SET credits = user_credits.credits + $2, updated_at = NOW()
        `, [deviceId, points]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        points,
        message: `验证成功，+${points} 点数`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('验证码验证失败:', error);
    return NextResponse.json(
      { error: '验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 查询验证码状态（不消费）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '请提供验证码' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const result = await sql`
      SELECT status, points, created_at
      FROM verification_codes
      WHERE code = ${cleanCode}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      status: result.rows[0].status,
      points: result.rows[0].points
    });

  } catch (error) {
    console.error('查询验证码失败:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}
