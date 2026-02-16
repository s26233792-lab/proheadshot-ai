import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 从 JSON 批量导入验证码（兼容旧的 codes.json 格式）
export async function POST(request: NextRequest) {
  try {
    const { codes, merge = true } = await request.json();

    if (!codes || typeof codes !== 'object') {
      return NextResponse.json(
        { error: '无效的验证码数据' },
        { status: 400 }
      );
    }

    const client = await sql.connect();
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    try {
      await client.query('BEGIN');

      for (const [code, data] of Object.entries(codes)) {
        // 跳过元数据字段
        if (code.startsWith('_')) continue;

        const cleanCode = code.trim().toUpperCase();
        const codeData = data as any;

        try {
          // 检查是否已存在
          const existsResult = await client.query(`
            SELECT 1 FROM verification_codes WHERE code = $1
          `, [cleanCode]);

          if (existsResult.rows.length > 0) {
            if (merge) {
              // 合并模式：更新现有记录
              await client.query(`
                UPDATE verification_codes
                SET points = $1, updated_at = NOW()
                WHERE code = $2
              `, [codeData.points || 1, cleanCode]);
              imported++;
            } else {
              skipped++;
            }
          } else {
            // 插入新记录
            await client.query(`
              INSERT INTO verification_codes (code, points, status, created_at)
              VALUES ($1, $2, $3, $4)
            `, [
              cleanCode,
              codeData.points || 1,
              codeData.status || 'active',
              codeData.createdAt || new Date().toISOString()
            ]);
            imported++;
          }
        } catch (error) {
          console.error(`导入验证码 ${cleanCode} 失败:`, error);
          errors++;
        }
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
        imported,
        skipped,
        errors,
        message: `导入完成：${imported} 条成功，${skipped} 条跳过，${errors} 条失败`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('批量导入失败:', error);
    return NextResponse.json(
      { error: '导入失败' },
      { status: 500 }
    );
  }
}
