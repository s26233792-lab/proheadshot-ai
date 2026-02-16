# Vercel Postgres 验证码系统

基于 Vercel Postgres 的跨设备验证码解决方案，彻底解决原 GitHub 方案的跨设备同步问题。

## ✨ 特性

- ✅ **真正的跨设备支持** - 数据存储在云端数据库，天然支持多设备
- ✅ **无需 GitHub Token** - 不再需要配置和同步 GitHub
- ✅ **高性能** - 数据库查询比 GitHub API 快 10-100 倍
- ✅ **免费额度充足** - 支持约 7,000 单/天
- ✅ **简单部署** - 几分钟即可完成部署

## 📁 新增文件

```
api/
├── init-db/route.ts          # 数据库初始化端点
├── verify-code/route.ts      # 验证码验证 API
├── generate-codes/route.ts   # 生成验证码 API
├── import-codes/route.ts     # 导入验证码 API
├── export-codes/route.ts     # 导出验证码 API
├── stats/route.ts            # 统计数据 API
├── credits/route.ts          # 用户积分 API
└── db/
    ├── schema.sql            # 数据库表结构
    └── init.js               # 初始化脚本

js/
└── api-client.js             # 前端 API 客户端

test-api.html                 # API 测试工具
package.json                  # 项目依赖
tsconfig.json                 # TypeScript 配置
vercel.json                   # Vercel 配置
DEPLOYMENT_GUIDE.md           # 详细部署指南
MIGRATION_GUIDE.md            # 代码迁移指南
```

## 🚀 快速开始

### 1. 部署到 Vercel

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "Add Vercel Postgres integration"
git push

# 2. 在 Vercel 导入项目并部署
# 访问 vercel.com → Add New → Project
```

### 2. 创建数据库

在 Vercel 项目页面：
1. 进入 **Storage** 标签
2. 点击 **Create Database** → **Postgres**
3. 选择地区并创建

### 3. 初始化数据库

部署完成后访问：
```
https://your-project.vercel.app/api/init-db
```

### 4. 测试 API

访问测试工具：
```
https://your-project.vercel.app/test-api.html
```

## 📊 免费额度

| 项目 | 额度 |
|------|------|
| 计算时间 | 60小时/月 |
| 存储 | 256MB |
| 支持单量 | ~7,000单/天 |

## 🔧 API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/verify-code` | 验证验证码 |
| `POST /api/generate-codes` | 生成验证码 |
| `GET /api/stats` | 获取统计 |
| `GET /api/credits` | 获取积分 |
| `POST /api/credits` | 消费积分 |
| `GET /api/export-codes` | 导出数据 |
| `POST /api/import-codes` | 导入数据 |

详细文档请查看 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 🔄 从旧系统迁移

1. 导出旧系统的 codes.json
2. 访问 `/test-api.html` 或使用 API 导入
3. 按照 [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) 修改前端代码

## ❓ 常见问题

**Q: Vercel Postgres 会休眠吗？**
A: 10分钟无活动后休眠，唤醒需 1-3 秒。对验证码场景影响很小。

**Q: 数据安全吗？**
A: Vercel Postgres 是托管的 PostgreSQL 数据库，有自动备份和加密。

**Q: 超出免费额度怎么办？**
A: Pro 计划 $20/月，可支持约 60,000 单/天。

## 📞 支持

- [Vercel Postgres 文档](https://vercel.com/docs/storage/vercel-postgres)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [迁移指南](MIGRATION_GUIDE.md)
