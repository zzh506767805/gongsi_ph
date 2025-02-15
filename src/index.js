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
      {
        query,
        variables: { topic: keyword }
      },
      { headers: producthuntHeaders }
    );

    if (!response.data?.data?.posts?.edges) {
      console.error('ProductHunt API响应格式错误:', JSON.stringify(response.data, null, 2));
      return [];
    }

    return response.data.data.posts.edges.map(({ node: post }) => ({
      name: post.name,
      tagline: post.tagline,
      description: post.description,
      url: post.url,
      votesCount: post.votesCount,
      website: post.website,
      createdAt: post.createdAt,
      topics: post.topics?.edges?.map(edge => edge.node.name) || []
    }));
  } catch (error) {
    console.error('ProductHunt API请求失败:', error.response?.data || error.message);
    return [];
  }
}

// 使用GPT整理数据
async function analyzeProducts(products, topic) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "你是一个产品分析专家，请分析ProductHunt上的产品数据并生成分析报告。请基于提供的产品数据进行深入分析，重点关注以下方面：\n1. 市场概览：分析当前市场上的主要产品都在提供什么核心能力，有哪些主要功能方向\n2. 市场诉求：深入分析用户可能想要的功能和特性，包括未被满足的需求和痛点\n3. 潜在竞争点：如何通过差异化定位或功能创新来建立竞争优势，包括可能的改进方向和创新机会\n\n请直接生成分析报告，无需重复产品数据。使用清晰的标题和段落结构，确保报告易于阅读和理解。"
      },
      {
        role: "user",
        content: `请分析以下与"${topic}"相关的产品数据，按照上述两个部分的结构生成报告。\n产品数据：\n${JSON.stringify(products, null, 2)}`
      }
    ]
  });
  return completion.choices[0].message.content;
}

// 主函数
async function main(topic) {
  try {
    console.log(`开始研究主题: ${topic}`);
    
    // 1. 生成关键词
    const keywords = await generateKeywords(topic);
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('关键词生成失败或结果为空');
    }
    console.log('生成的关键词:', keywords);

    // 2. 搜索ProductHunt
    let allProducts = [];
    for (const keyword of keywords) {
      const products = await searchProductHunt(keyword);
      if (!products || !Array.isArray(products)) {
        throw new Error(`搜索关键词"${keyword}"时发生错误`);
      }
      allProducts = allProducts.concat(products);
    }

    // 去重
    allProducts = Array.from(new Set(allProducts.map(p => JSON.stringify(p)))).map(p => JSON.parse(p));
    if (allProducts.length === 0) {
      throw new Error('未找到任何相关产品');
    }
    console.log(`找到 ${allProducts.length} 个相关产品`);

    // 3. 使用GPT分析数据
    const analysis = await analyzeProducts(allProducts, topic);
    if (!analysis) {
      throw new Error('产品分析失败');
    }

    return {
      content: analysis,
      keywords: keywords,
      products: allProducts
    };

  } catch (error) {
    console.error('执行过程中出现错误:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

app.use(cors());
app.use(express.json());

// 主研究路由
app.post('/api/research', async (req, res) => {
  try {
    const { topic } = req.body;
    const result = await main(topic);
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