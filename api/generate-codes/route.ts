import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 生成随机验证码
function generateCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 检查验证码是否已存在
async function isCodeExists(code: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM verification_codes WHERE code = ${code}
  `;
  return result.rows.length > 0;
}

// 生成唯一验证码
async function generateUniqueCode(length = 8): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = generateCode(length);
    attempts++;
    if (attempts > maxAttempts) {
      // 如果尝试太多次，增加长度
      length++;
      attempts = 0;
    }
  } while (await isCodeExists(code!));

  return code!;
}

// 生成验证码
export async function POST(request: NextRequest) {
  try {
    const { points = 1, amount = 1, codeLength = 8 } = await request.json();

    if (amount < 1 || amount > 1000) {
      return NextResponse.json(
        { error: '生成数量必须在 1-1000 之间' },
        { status: 400 }
      );
    }

    if (points < 1 || points > 10000) {
      return NextResponse.json(
        { error: '点数必须在 1-10000 之间' },
        { status: 400 }
      );
    }

    const generatedCodes = [];

    // 使用事务批量插入
    const client = await sql.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < amount; i++) {
        const code = await generateUniqueCode(codeLength);

        await client.query(`
          INSERT INTO verification_codes (code, points, status)
          VALUES ($1, $2, 'active')
        `, [code, points]);

        generatedCodes.push({
          code,
          points,
          status: 'active'
        });
      }

      // 更新系统版本号
      await client.query(`
        INSERT INTO system_meta (key, value, updated_at)
        VALUES ('version', NOW()::TEXT, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = NOW()::TEXT, updated_at = NOW()
      `);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        codes: generatedCodes,
        count: generatedCodes.length,
        message: `已生成 ${generatedCodes.length} 张验证码`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('生成验证码失败:', error);
    return NextResponse.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 获取所有验证码列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // active, used, or all
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = 'SELECT * FROM verification_codes';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await sql.query(query, params);

    return NextResponse.json({
      codes: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('获取验证码列表失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}
