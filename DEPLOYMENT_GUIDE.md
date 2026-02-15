# Vercel Postgres 验证码系统部署指南

## 📋 部署前准备

1. **Vercel 账号**
   - ���问 [vercel.com](https://vercel.com) 注册/登录

2. **GitHub 仓库**
   - 将项目代码推送到 GitHub

## 🚀 部署步骤

### 第一步：创建并链接 Vercel Postgres 数据库

1. 在 Vercel 项目页面，进入 **Storage** 标签
2. 点击 **Create Database**
3. 选择 **Postgres** → **Continue**
4. 选择地区（推荐 **Hong Kong** 或 **Tokyo**）
5. 点击 **Create**

Vercel 会自动配置以下环境变量：
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
```

### 第二步：部署项目到 Vercel

1. 在 Vercel 点击 **Add New** → **Project**
2. 导入你的 GitHub 仓库
3. Vercel 会自动检测 Next.js 项目
4. 点击 **Deploy**

### 第三步：初始化数据库

部署完成后，访问：
```
https://your-project.vercel.app/api/init-db
```

看到成功页面即表示数据库初始化完成！

### 第四步：迁移现有数据（可选）

如果你有旧的 `codes.json` 数据：

1. 访问管理面板
2. 使用导入功能上传 `codes.json`
3. 或使用 API：

```bash
curl -X POST https://your-project.vercel.app/api/import-codes \
  -H "Content-Type: application/json" \
  -d @codes.json
```

## 📁 项目结构

```
proheadshot-ai/
├── api/
│   ├── init-db/
│   │   └── route.ts          # 数据库初始化端点
│   ├── verify-code/
│   │   └── route.ts          # 验证码验证
│   ├── generate-codes/
│   │   └── route.ts          # 生成验证码
│   ├── import-codes/
│   │   └── route.ts          # 导入验证码
│   ├── export-codes/
│   │   └── route.ts          # 导出验证码
│   ├── stats/
│   │   └── route.ts          # 统计数据
│   ├── credits/
│   │   └── route.ts          # 用户积分
│   └── db/
│       ├── schema.sql        # 数据库表结构
│       └── init.js           # 初始化脚本
├── js/
│   └── api-client.js         # 前端 API 客户端
├── index.html                # 主页面（需要按 MIGRATION_GUIDE.md 修改）
├── package.json
└── vercel.json               # Vercel 配置
```

## 🔧 API 端点说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/init-db` | GET | 初始化数据库表 |
| `/api/verify-code` | POST | 验证验证码 |
| `/api/verify-code?code=XXX` | GET | 查询验证码状态 |
| `/api/generate-codes` | POST | 生成验证码 |
| `/api/generate-codes?status=active` | GET | 获取验证码列表 |
| `/api/import-codes` | POST | 导入验证码 |
| `/api/export-codes` | GET | 导出验证码为 JSON |
| `/api/stats` | GET | 获取统计数据 |
| `/api/credits` | GET | 获取用户积分 |
| `/api/credits` | POST | 消费积分 |

## 📊 免费额度

Vercel Postgres 免费计划：
- **60小时/月** 计算时间
- **256MB** 存储
- **每10分钟无活动后休眠**
- **唤醒时间** 1-3秒

**可支持规模**：约 **7,000 单/天**

## 🔄 从旧系统迁移

### GitHub → Vercel Postgres

旧系统使用 GitHub 存储验证码，新系统使用数据库：

| 旧系统 | 新系统 |
|--------|--------|
| `localStorage` + GitHub API | Vercel Postgres |
| 需要配置 GitHub Token | 无需额外配置 |
| 跨设备同步问题 | 天然支持跨设备 |
| 手动导入 codes.json | API 自动导入 |

### 数据迁移步骤

1. **导出旧数据**
   ```javascript
   // 在旧系统中导出
   const codes = localStorage.getItem('proheadshot_codes_db');
   const blob = new Blob([codes], { type: 'application/json' });
   // 下载为 codes.json
   ```

2. **导入到新系统**
   ```bash
   curl -X POST https://your-project.vercel.app/api/import-codes \
     -H "Content-Type: application/json" \
     -d @codes.json
   ```

## 🧪 测试 API

部署后测试 API 是否正常：

```bash
# 1. 初始化数据库
curl https://your-project.vercel.app/api/init-db

# 2. 生成测试验证码
curl -X POST https://your-project.vercel.app/api/generate-codes \
  -H "Content-Type: application/json" \
  -d '{"points":1,"amount":5}'

# 3. 验证测试
curl -X POST https://your-project.vercel.app/api/verify-code \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE"}'

# 4. 查看统计
curl https://your-project.vercel.app/api/stats
```

## 🐛 常见问题

### 1. 数据库连接失败
- 检查 Vercel Storage 中是否已创建数据库
- 确认环境变量已正确配置

### 2. 部署后无法访问 API
- 确认 `package.json` 中有 `next` 依赖
- 检查 API 文件路径是否正确

### 3. 验证码验证失败
- 检查数据库中是否有该验证码
- 查看浏览器控制台的错误信息

## 📞 获取帮助

- Vercel 文档: [vercel.com/docs](https://vercel.com/docs)
- Vercel Postgres: [vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
