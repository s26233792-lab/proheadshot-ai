import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 导出所有验证码为 JSON
export async function GET(request: NextRequest) {
  try {
    const result = await sql`
      SELECT
        code,
        points,
        status,
        created_at,
        used_at
      FROM verification_codes
      ORDER BY created_at DESC
    `;

    // 构建导出数据（包含元数据）
    const exportData = {
      _meta: {
        version: new Date().toISOString(),
        exported_at: new Date().toISOString(),
        total_count: result.rows.length
      },
      codes: result.rows.reduce((acc: any, row: any) => {
        acc[row.code] = {
          points: row.points,
          status: row.status,
          createdAt: row.created_at,
          usedAt: row.used_at
        };
        return acc;
      }, {})
    };

    // 返回 JSON 文件
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="verification-codes-${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error('导出验证码失败:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}
