require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { main } = require('./index');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 获取实际URL的端点
app.get('/api/get-actual-url', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: '请提供URL' });
    }

    const response = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: null,
      timeout: 5000 // 5秒超时
    });
    
    if (response.status >= 400) {
      return res.status(404).json({ message: '该网站可能已不可用' });
    }

    res.json({ url: response.request.res.responseUrl || response.config.url });
  } catch (error) {
    console.error('获取实际URL失败:', error);
    res.status(404).json({ message: '该网站可能已不可用' });
  }
});

// 深度研究API
app.post('/api/deep-research', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: '请提供URL' });
    }

    if (!process.env.COZE_API_KEY || !process.env.COZE_WORKFLOW_ID) {
      throw new Error('Coze API 配置缺失');
    }

    const response = await axios.post('https://api.coze.cn/v1/workflow/run', {
      parameters: {
        input: url
      },
      workflow_id: process.env.COZE_WORKFLOW_ID
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.data || response.data.code !== 0) {
      console.error('Coze API响应异常:', response.data);
      const errorMsg = response.data?.msg || '';
      // 特定错误信息的处理
      if (errorMsg.includes('fields cannot be extracted from null values')) {
        throw new Error('该网页可能无法被抓取，请手动访问');
      }
      throw new Error(errorMsg || '深度研究失败');
    }

    try {
      const parsedData = JSON.parse(response.data.data);
      if (!parsedData || !parsedData.output) {
        throw new Error('该网页可能无法被抓取，请手动访问');
      }
      res.json({ output: parsedData.output });
    } catch (parseError) {
      console.error('解析Coze返回数据失败:', response.data);
      throw new Error('该网页可能无法被抓取，请手动访问');
    }
  } catch (error) {
    console.error('深度研究失败:', error);
    res.status(500).json({ 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/api/research', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ message: '请提供产品主题' });
    }

    const result = await main(topic);
    
    // 确保返回前端需要的数据结构
    res.json({
      content: result.content || '',
      keywords: result.keywords || [],
      products: result.products || []
    });
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ message: error.message || '服务器内部错误' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});