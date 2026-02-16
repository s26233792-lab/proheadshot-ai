/**
 * Vercel API 客户端
 * 用于调用 Vercel Serverless Functions
 */

const API_BASE = window.location.origin; // 自动适配当前域名

class ApiClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * 生成设备ID
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('proheadshot_device_id');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('proheadshot_device_id', deviceId);
    }
    return deviceId;
  }

  generateDeviceId() {
    // 基于浏览器特征生成设备指纹（稳定，不随时间变化）
    const features = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ].join('|');

    // 简单哈希
    let hash = 0;
    for (let i = 0; i < features.length; i++) {
      const char = features.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // 移除 Date.now()，使用稳定的设备 ID
    return 'device_' + Math.abs(hash).toString(36);
  }

  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      return data;
    } catch (error) {
      console.error(`API 请求失败 ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(code) {
    return this.request('/verify-code', {
      method: 'POST',
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        deviceId: this.getDeviceId()
      })
    });
  }

  /**
   * 查询验证码状态
   */
  async checkCodeStatus(code) {
    return this.request(`/verify-code?code=${encodeURIComponent(code.trim().toUpperCase())}`);
  }

  /**
   * 生成验证码
   */
  async generateCodes(points, amount, codeLength = 8) {
    return this.request('/generate-codes', {
      method: 'POST',
      body: JSON.stringify({ points, amount, codeLength })
    });
  }

  /**
   * 获取验证码列表
   */
  async getCodesList(status = 'all', limit = 100, offset = 0) {
    return this.request(`/generate-codes?status=${status}&limit=${limit}&offset=${offset}`);
  }

  /**
   * 获取统计数据
   */
  async getStats() {
    return this.request('/stats');
  }

  /**
   * 导入验证码
   */
  async importCodes(codes, merge = true) {
    return this.request('/import-codes', {
      method: 'POST',
      body: JSON.stringify({ codes, merge })
    });
  }

  /**
   * 导出验证码
   */
  async exportCodes() {
    const url = `${this.baseURL}/api/export-codes`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('导出失败');
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `verification-codes-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      return true;
    } catch (error) {
      console.error('导出验证码失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户积分
   */
  async getCredits() {
    return this.request('/credits');
  }

  /**
   * 消费积分
   */
  async consumeCredits(amount = 1) {
    return this.request('/credits', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }

  /**
   * 重试同步单个验证码
   */
  async retrySyncCode(code) {
    return this.request('/sync-code', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim().toUpperCase() })
    });
  }

  /**
   * 批量同步失败的验证码
   */
  async batchSyncFailedCodes() {
    return this.request('/sync-codes/batch', {
      method: 'POST',
      body: JSON.stringify({ syncType: 'failed' })
    });
  }

  /**
   * 同步所有验证码
   */
  async syncAllCodes() {
    return this.request('/sync-codes/batch', {
      method: 'POST',
      body: JSON.stringify({ syncType: 'all' })
    });
  }

  /**
   * 删除单个验证码
   */
  async deleteCode(code) {
    return this.request('/delete-code', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim().toUpperCase() })
    });
  }

  /**
   * 批量删除验证码
   */
  async deleteCodes(codes) {
    return this.request('/delete-codes/batch', {
      method: 'POST',
      body: JSON.stringify({ codes })
    });
  }

  /**
   * 按类型批量删除验证码
   */
  async deleteCodesByType(deleteType) {
    return this.request('/delete-codes/batch', {
      method: 'POST',
      body: JSON.stringify({ deleteType })
    });
  }

  /**
   * 清空所有验证码
   */
  async clearAllCodes() {
    return this.request('/delete-codes/batch', {
      method: 'POST',
      body: JSON.stringify({ deleteType: 'all' })
    });
  }

  /**
   * 通过代理生成图片
   */
  async generateImageProxy(imageBase64, prompt, modelId, signal) {
    const url = `${this.baseURL}/api/generate-image`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, prompt, modelId }),
        signal: signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '请求失败');
      }

      const data = await response.json();
      if (data.success && data.imageData) {
        return data.imageData;
      }

      throw new Error(data.error || '未收到图片数据');
    } catch (error) {
      console.error('代理生成图片失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
const apiClient = new ApiClient();
