const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { imageBase64, prompt, modelId } = JSON.parse(event.body || '{}');

    const apiKey = process.env.GEMINI_API_KEY;
    const apiBase = process.env.GEMINI_API_BASE || 'https://new.12ai.org';
    const model = modelId || 'gemini-3-pro-image-preview';

    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API Key 未配置' }) };
    }

    // 构建请求 URL
    let baseUrl = apiBase.replace(/\/+$/, '');  // 移除末尾斜杠
    // 移除可能存在的 /v1 或 /v1beta 后缀，避免重复
    baseUrl = baseUrl.replace(/\/v1beta$|\/v1$/, '');
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 构建请求体
    const requestBody = {
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"]
      }
    };

    // 调用 Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: '未知错误' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // 提取图片数据
    const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData?.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageData: `data:image/jpeg;base64,${imagePart.inlineData.data}`
        })
      };
    }

    throw new Error('未收到图片数据');

  } catch (error) {
    console.error('图片生成失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
