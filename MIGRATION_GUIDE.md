# 前端代码迁移指南

## 第一步：引入 API 客户端

在 `index.html` 的 `<head>` 中添加：

```html
<script src="js/api-client.js"></script>
```

## 第二步：替换验证码验证逻辑

找到原有的 `verifyCode()` ��数（约 1527 行），替换为：

```javascript
async function verifyCode() {
    const input = document.getElementById('verify-code-input');
    const code = input.value.trim();

    if (!code) {
        alert('请输入卡密');
        return;
    }

    // 显示加载状态
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> 正在验证...';

    try {
        // 使用新的 API 客户端
        const result = await apiClient.verifyCode(code);

        if (result.success) {
            // 获取最新积分
            const creditsData = await apiClient.getCredits();
            config.credits = creditsData.credits;

            closeModal('credit-modal');
            showStatus(`充值成功 +${result.points} 点数`, "success");
            input.value = '';
        }
    } catch (e) {
        alert(e.message || '验证失败，请稍后重试');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
```

## 第三步：替换验证码生成逻辑

找到 `CodeManager.generate()` 方法，替换为：

```javascript
const CodeManager = {
    getKey: () => 'proheadshot_codes_db',

    // 生成验证码（调用 API）
    generate: async (points, amount) => {
        try {
            const result = await apiClient.generateCodes(points, amount);
            if (result.success) {
                // 同时更新本地缓存
                const codes = CodeManager.getAll();
                result.codes.forEach(code => {
                    codes[code.code] = {
                        points: code.points,
                        status: code.status
                    };
                });
                CodeManager.save(codes);
                return result.codes;
            }
            return [];
        } catch (e) {
            console.error('生成验证码失败:', e);
            alert('生成失败：' + e.message);
            return [];
        }
    },

    // 验证并兑换卡密（已移到 API，保留兼容）
    redeem: async (code) => {
        try {
            const result = await apiClient.verifyCode(code);
            return result.points || 0;
        } catch (e) {
            console.error('验证卡密失败:', e);
            return 0;
        }
    },

    // 本地存储方法（作为缓存）
    getAll: () => {
        try {
            const data = localStorage.getItem(CodeManager.getKey());
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    save: (codes) => {
        try {
            localStorage.setItem(CodeManager.getKey(), JSON.stringify(codes));
            return true;
        } catch (e) {
            return false;
        }
    },

    // 从 API 获取列表
    fetchList: async (status = 'all') => {
        try {
            const result = await apiClient.getCodesList(status, 1000, 0);
            return result.codes || [];
        } catch (e) {
            console.error('获取列表失败:', e);
            return [];
        }
    },

    // 同步到 API（导入本地数据）
    syncToAPI: async () => {
        const localCodes = CodeManager.getAll();
        try {
            const result = await apiClient.importCodes(localCodes, true);
            return result;
        } catch (e) {
            console.error('同步失败:', e);
            throw e;
        }
    },

    // 导出验证码
    exportToFile: async () => {
        try {
            await apiClient.exportCodes();
            showStatus("验证码已导出", "success");
        } catch (e) {
            alert('导出失败：' + e.message);
        }
    }
};
```

## 第四步：替换积分管理逻辑

找到 `CreditManager` 对象，替换为：

```javascript
const CreditManager = {
    getKey: () => 'proheadshot_credits',

    get: async () => {
        try {
            const result = await apiClient.getCredits();
            return result.credits || 0;
        } catch (e) {
            // 降级到本地存储
            return parseInt(localStorage.getItem(CreditManager.getKey()) || '0');
        }
    },

    add: async (points) => {
        // 积分在验证时自动添加，这里只更新本地缓存
        const current = await CreditManager.get();
        config.credits = current + points;
        localStorage.setItem(CreditManager.getKey(), config.credits.toString());
    },

    consume: async (amount = 1) => {
        try {
            const result = await apiClient.consumeCredits(amount);
            if (result.success) {
                config.credits = result.remaining;
                localStorage.setItem(CreditManager.getKey(), result.remaining.toString());
                return true;
            }
            return false;
        } catch (e) {
            console.error('消费积分失败:', e);
            alert(e.message || '积分不足');
            return false;
        }
    }
};
```

## 第五步：更新管理员功能

找到管理员面板中的相关函数：

```javascript
// 生成验证码按钮事件
document.getElementById('admin-generate-btn')?.addEventListener('click', async () => {
    const points = parseInt(document.getElementById('admin-points').value) || 1;
    const amount = parseInt(document.getElementById('admin-amount').value) || 10;

    const generated = await CodeManager.generate(points, amount);
    if (generated.length > 0) {
        renderCodeList();
        showStatus(`已生成 ${amount} 张卡密`, "success");
    }
});

// 导出按钮事件
document.getElementById('admin-export-btn')?.addEventListener('click', async () => {
    await CodeManager.exportToFile();
});

// 渲染验证码列表
async function renderCodeList() {
    const codes = await CodeManager.fetchList('all');
    // ... 渲染逻辑
}

// 统计数据
async function updateStats() {
    try {
        const stats = await apiClient.getStats();
        // 更新 UI 显示
    } catch (e) {
        console.error('获取统计失败:', e);
    }
}
```

## 第六步：移除 GitHub 相关代码

删除以下不再需要的代码：
- `CodeManager.syncToGitHub()`
- `CodeManager.syncFromGitHub()`
- `CodeManager._fetchLatestCodes()`
- `CodeManager._syncWithLock()`
- GitHub Token 配置相关代码

## 完整的配置示例

### Vercel 环境变量

在 Vercel 项目设置中添加：

```bash
POSTGRES_URL=your_vercel_postgres_url
POSTGRES_PRISMA_URL=your_vercel_postgres_url
POSTGRES_URL_NON_POOLING=your_vercel_postgres_url
```

### 本地开发环境变量

创建 `.env.local` 文件：

```bash
POSTGRES_URL=postgresql://user:password@localhost:5432/proheadshot
```

## 部署步骤

1. 在 Vercel 创建/链接 Postgres 数据库
2. 将代码推送到 Git
3. 在 Vercel 部署项目
4. 部署完成后，访问 `/api/export-codes` 导出现有数据
5. 使用管理面板的"导入"功能迁移数据
