require('dotenv').config();
const { OpenAI } = require('openai');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const app = express();

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://proxy.tainanle.online/v1'
});

// ProductHunt API配置
const PRODUCTHUNT_API_URL = 'https://api.producthunt.com/v2/api/graphql';
const producthuntHeaders = {
  'Authorization': `Bearer ${process.env.PRODUCTHUNT_DEVELOPER_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// 生成相关关键词
async function generateKeywords(topic) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "你是一个产品分析专家，请根据给定的主题生成适合 ProductHunt 的搜索标签。请遵循以下规则：\n1. 将主题转化为英文并生成相关标签\n2. 深入理解主题的类型，生成同类型的相关标签（例如：如果主题是'智能获客'，应该包含'lead'、'lead-generation'等相关标签）\n"
      },
      {
        role: "user",
        content: `请为主题"${topic}"生成10个适合 ProductHunt 搜索的主题标签（优先使用单个最相关的英文单词）。直接返回标签列表，用逗号分隔。例如：ai, productivity, lead, design-tools, ai-tools`
      }
    ]
  });
  return completion.choices[0].message.content.split(',').map(k => k.trim().toLowerCase());
}

// 从ProductHunt获取数据
async function searchProductHunt(keyword) {
  try {
    console.log('发送ProductHunt API请求，关键词:', keyword);
    const query = `
      query($topic: String!) {
        posts(first: 10, topic: $topic, order: RANKING) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              website
              createdAt
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      PRODUCTHUNT_API_URL,
      { query, variables: { topic: keyword } },
      { headers: producthuntHeaders }
    );

    if (response.data.data && response.data.data.posts) {
      return response.data.data.posts.edges.map(edge => ({
        name: edge.node.name,
        tagline: edge.node.tagline,
        description: edge.node.description,
        url: edge.node.url,
        votesCount: edge.node.votesCount,
        website: edge.node.website,
        createdAt: edge.node.createdAt,
        topics: edge.node.topics.edges.map(topicEdge => topicEdge.node.name)
      }));
    }
    return [];
  } catch (error) {
    console.error('ProductHunt API请求失败:', error.response?.data || error.message);
    return [];
  }
}

// 主函数
async function main(topic) {
  console.log('开始研究主题:', topic);
  
  // 1. 生成关键词
  const keywords = await generateKeywords(topic);
  console.log('生成的关键词:', keywords);
  
  // 2. 搜索ProductHunt
  let allProducts = [];
  for (const keyword of keywords) {
    const products = await searchProductHunt(keyword);
    allProducts = allProducts.concat(products);
  }
  
  // 去重
  const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.name, item])).values());
  console.log('找到', uniqueProducts.length, '个相关产品');
  
  return {
    content: '', // 不再生成市场研究报告
    keywords: keywords,
    products: uniqueProducts
  };
}

app.use(cors());
app.use(express.json());

// 主研究路由
app.post('/api/research', async (req, res) => {
  try {
    const { topic, existingResearch } = req.body;
    if (!topic) {
      return res.status(400).json({ message: '请提供产品主题' });
    }

    const result = await main(topic);

    // 如果提供了已有的深度研究结果，添加到新的搜索结果中
    if (existingResearch) {
      result.products = result.products.map(product => ({
        ...product,
        deepResearch: product.website ? existingResearch[product.website] : undefined
      }));
    }

    res.json(result);
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ message: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 如果直接运行此文件
if (require.main === module) {
  const topic = process.argv[2];
  if (!topic) {
    console.error('请提供产品主题作为参数');
    process.exit(1);
  }
  main(topic);
}

module.exports = { main };