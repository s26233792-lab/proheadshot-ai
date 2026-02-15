import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 获取验证码统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取基本统计
    const statsResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'used') as used,
        COALESCE(SUM(points) FILTER (WHERE status = 'active'), 0) as total_points
      FROM verification_codes
    `;

    // 获取今日使用统计
    const todayResult = await sql`
      SELECT COUNT(*) as today_used
      FROM usage_logs
      WHERE DATE(created_at) = CURRENT_DATE
    `;

    // 获取最近7天使用趋势
    const trendResult = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(points) as points
      FROM usage_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // 获取系统版本
    const versionResult = await sql`
      SELECT value FROM system_meta WHERE key = 'version'
    `;

    return NextResponse.json({
      stats: statsResult.rows[0],
      today: todayResult.rows[0],
      trend: trendResult.rows,
      version: versionResult.rows[0]?.value || null
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}
