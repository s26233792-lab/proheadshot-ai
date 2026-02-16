-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  code VARCHAR(50) PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  device_info TEXT, -- 存储使用的设备信息（可选）
  INDEX idx_status (status)
);

-- 用户积分表（如果需要按用户追踪）
CREATE TABLE IF NOT EXISTS user_credits (
  device_id VARCHAR(100) PRIMARY KEY, -- 用设备指纹作为用户ID
  credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用记录表（可选，用于统计）
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  device_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (code) REFERENCES verification_codes(code) ON DELETE CASCADE
);

-- 元数据表（存储版本信息，用于乐观锁）
CREATE TABLE IF NOT EXISTS system_meta (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初始化版本号
INSERT INTO system_meta (key, value) VALUES ('version', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;
