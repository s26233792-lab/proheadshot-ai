# ProHeadShot AI 项目部署指南

## 项目信息

- **项目名称**: ProHeadShot AI (AI美式照片照相���)
- **GitHub 仓库**: https://github.com/s26233792-lab/proheadshot-ai
- **Netlify 网站地址**: https://aizhaoxianguan.netlify.app

---

## 第一部分：Supabase 配置

### 1.1 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **"New Project"** 按钮
3. 填写项目信息：
   - **Name**: `proheadshot`（或任意名称）
   - **Database Password**: 设置一个密码并记住
   - **Region**: 选择 **Southeast Asia (Singapore)**
4. 点击 **"Create new project"**
5. 等待 1-2 分钟让项目创建完成

### 1.2 获取项目信息

项目创建后，记录以下信息（从 Settings → API 获取）：

```
Project URL: https://你的项目ID.supabase.co
service_role key: eyJhbGci...（长字符串）
```

### 1.3 创建数据库表

1. 在 Supabase Dashboard 点击左侧菜单的 **SQL Editor**
2. 点击 **"New query"** 按钮
3. 粘贴以下 SQL 并执行：

```sql
-- 验证码表
CREATE TABLE verification_codes (
  code TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_error TEXT,
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户积分表
CREATE TABLE user_credits (
  device_id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 使用日志表
CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  points INTEGER NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 关闭 RLS
ALTER TABLE verification_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX idx_verification_codes_status ON verification_codes(status);
CREATE INDEX idx_verification_codes_created_at ON verification_codes(created_at DESC);
CREATE INDEX idx_verification_codes_sync_status ON verification_codes(sync_status);
CREATE INDEX idx_user_credits_device_id ON user_credits(device_id);
CREATE INDEX idx_usage_logs_code ON usage_logs(code);
CREATE INDEX idx_usage_logs_device_id ON usage_logs(device_id);
```

4. 点击 **Run** 执行

---

## 第二部分：Netlify 配置

### 2.1 连接 GitHub 到 Netlify

1. 访问 [Netlify Dashboard](https://app.netlify.com)
2. 点击 **"Add new site"** → **"Import an existing project"**
3. 选择 **GitHub**
4. 找到并选择 `s26233792-lab/proheadshot-ai` 仓库
5. 配置构建设置：
   - **Build command**: 留空
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
6. 点击 **"Deploy site"**

### 2.2 配置环境变量

1. 在 Netlify Dashboard 进入你的项目
2. 点击 **Site settings** → **Environment variables**
3. 点击 **"Add a variable"**，逐个添加：

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...（service_role key）` |

4. 点击 **Save** 保存每个变量

### 2.3 更新 netlify.toml

确保 `netlify.toml` 文件包含以下内容：

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/verify-code"
  to = "/.netlify/functions/verify-code"
  status = 200

[[redirects]]
  from = "/api/generate-codes"
  to = "/.netlify/functions/generate-codes"
  status = 200

[[redirects]]
  from = "/api/credits"
  to = "/.netlify/functions/credits"
  status = 200

[[redirects]]
  from = "/api/stats"
  to = "/.netlify/functions/stats"
  status = 200

[[redirects]]
  from = "/api/import-codes"
  to = "/.netlify/functions/import-codes"
  status = 200

[[redirects]]
  from = "/api/sync-code"
  to = "/.netlify/functions/sync-code"
  status = 200

[[redirects]]
  from = "/api/sync-codes/batch"
  to = "/.netlify/functions/sync-codes-batch"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2.4 触发部署

1. 点击 **Deploys** 标签
2. 点击 **"Trigger deploy"** → **"Deploy site"**
3. 等待 1-2 分钟直到显示绿色 **"Published"**

---

## 第三部分：功能测试

### 3.1 测试网站访问

在浏览器打开：**https://你的网站名.netlify.app**

### 3.2 测试生成验证码

1. 点击右上角设置按钮 ⚙️
2. 输入管理员密码登录
3. 进入 **"卡密管理"** 面板
4. 选择点数，点击 **"生成卡密"**
5. 确认验证码成功生成

### 3.3 测试同步状态

生成的验证码应显示：
- 🟢 **已同步** - 正常存储到 Supabase
- 🔴 **失败** - 同步失败（很少见）

---

## 常见问题排查

### 问题 1：生成失败 - 请求失败

**原因**：Netlify Functions 环境变量未配置

**解决**：
1. 检查 Netlify → Site settings → Environment variables
2. 确认 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已添加
3. 重新触发部署

### 问题 2：Invalid API Key

**原因**：使用了错误的 API Key（使用了 `anon` 而不是 `service_role`）

**解决**：
1. 访问 Supabase Dashboard → Settings → API
2. 复制 **`service_role`** 密钥（不是 `anon public`）
3. 更新 Netlify 环境变量

### 问题 3：同步状态显示失败

**原因**：Supabase 表缺少新字段

**解决**：在 Supabase SQL Editor 执行：

```sql
ALTER TABLE verification_codes
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed'));

ALTER TABLE verification_codes
ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE verification_codes
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();
```

---

## 项目文件结构

```
proheadshot-ai/
├── index.html              # 主页面
├── js/
│   └── api-client.js       # API 客户端
├── netlify/
│   └── functions/
│       ├── supabase-client.js      # Supabase 客户端
│       ├── generate-codes.js        # 生成验证码
│       ├── verify-code.js           # 验证验证码
│       ├── sync-code.js             # 重试同步单个验证码
│       ├── sync-codes-batch.js      # 批量同步验证码
│       ├── credits.js               # 积分管理
│       ├── stats.js                 # 统计数据
│       └── import-codes.js           # 导入验证码
├── netlify.toml           # Netlify 配置
└── package.json           # 项目依赖
```

---

## 管理员密码

默认管理员密码：**terry_su**

可在 `index.html` 中修改：

```javascript
adminPwd: "terry_su"
```

---

## 数据库结构速查

### verification_codes 表

| 字段 | 类型 | 说明 |
|------|------|------|
| code | TEXT | 验证码（主键） |
| points | INTEGER | 点数 |
| status | TEXT | 状态：active/used |
| created_at | TIMESTAMPTZ | 创建时间 |
| used_at | TIMESTAMPTZ | 使用时间 |
| sync_status | TEXT | 同步状态：synced/pending/failed |
| sync_error | TEXT | 同步错误信息 |
| last_sync_at | TIMESTAMPTZ | 最后同步时间 |

### user_credits 表

| 字段 | 类型 | 说明 |
|------|------|------|
| device_id | TEXT | 设备ID（主键） |
| credits | INTEGER | 积分 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### usage_logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 日志ID（主键） |
| code | TEXT | 验证码 |
| points | INTEGER | 点数 |
| device_id | TEXT | 设备ID |
| created_at | TIMESTAMPTZ | 创建时间 |

---

## API 端点速查

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/generate-codes` | POST | 生成验证码 |
| `/api/generate-codes` | GET | 获取验证码列表 |
| `/api/verify-code` | POST | 验证验证码 |
| `/api/verify-code` | GET | 查询验证码状态 |
| `/api/credits` | GET | 获取用户积分 |
| `/api/credits` | POST | 消费积分 |
| `/api/stats` | GET | 获取统计数据 |
| `/api/sync-code` | POST | 重试同步单个验证码 |
| `/api/sync-codes/batch` | POST | 批量同步验证码 |
| `/api/import-codes` | POST | 导入验证码 |

---

## 部署检查清单

部署新环境时，按以下顺序检查：

- [ ] Supabase 项目已创建
- [ ] 数据库表已创建（3个表）
- [ ] 索引已创建
- [ ] 已获取 Project URL
- [ ] 已获取 service_role key
- [ ] Netlify 项目已连接 GitHub
- [ ] Netlify 环境变量已配置（2个变量）
- [ ] netlify.toml 配置正确
- [ ] 代码已推送到 GitHub
- [ ] Netlify 部署成功（Published）
- [ ] 网站可以访问
- [ ] 管理员可以登录
- [ ] 生成验证码功能正常
- [ ] 验证码功能正常
- [ ] 同步状态显示正常

---

## 联系信息

- **GitHub**: https://github.com/s26233792-lab/proheadshot-ai
- **问题反馈**: 创建 GitHub Issue
