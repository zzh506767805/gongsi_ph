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
        content: "你是一位资深的产品战略分析师，请对ProductHunt上的产品数据进行深度分析并生成专业的市场研究报告。请遵循以下分析框架：\n\n1. 市场格局分析\n- 产品类型分布：对现有产品进行分类，识别主流解决方案和创新方向\n- 技术栈分析：评估主要产品采用的技术方案和架构特点\n- 商业模式：分析主流的盈利模式和定价策略\n\n2. 用户需求洞察\n- 核心痛点：通过产品功能和用户反馈，提炼出关键的用户痛点\n- 使用场景：归纳主要的应用场景和用户行为模式\n- 需求缺口：发现现有产品未能很好满足的用户需求\n\n3. 竞争优势分析\n- 差异化空间：分析现有产品的重叠度，寻找差异化机会\n- 创新机会：基于技术发展和市场趋势，预测潜在的创新方向\n- 进入壁垒：评估市场准入门槛和竞争壁垒\n\n4. 发展建议\n- 产品定位：如何在现有市场中找到独特定位\n- 功能规划：建议优先开发的核心功能和特性\n- 商业策略：如何构建可持续的竞争优势\n\n请基于数据生成专业、客观的分析报告，使用清晰的标题层级，并尽可能提供具体的数据支持和实例说明。"
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