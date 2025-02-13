require('dotenv').config();
const { OpenAI } = require('openai');
const axios = require('axios');
const { Client } = require('@larksuiteoapi/node-sdk');

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 初始化飞书客户端
const feishuClient = new Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET
});

// ProductHunt API配置
const PRODUCTHUNT_API_URL = 'https://api.producthunt.com/v2/api/graphql';
const producthuntHeaders = {
  'Authorization': `Bearer ${process.env.PRODUCTHUNT_API_KEY}`,
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
        content: "你是一个产品分析专家，请根据给定的主题生成相关的搜索关键词。"
      },
      {
        role: "user",
        content: `请为主题"${topic}"生成5个相关的英文搜索关键词，每个关键词不超过3个单词。直接返回关键词列表，用逗号分隔。`
      }
    ]
  });
  return completion.choices[0].message.content.split(',').map(k => k.trim());
}

// 从ProductHunt获取数据
async function searchProductHunt(keyword) {
  const query = `
    query($query: String!) {
      posts(first: 10, query: $query) {
        edges {
          node {
            name
            tagline
            description
            url
            votesCount
            website
            createdAt
          }
        }
      }
    }
  `;

  const response = await axios.post(
    PRODUCTHUNT_API_URL,
    { query, variables: { query: keyword } },
    { headers: producthuntHeaders }
  );

  return response.data.data.posts.edges.map(edge => edge.node);
}

// 使用GPT整理数据
async function analyzeProducts(products, topic) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "你是一个产品分析专家，请分析ProductHunt上的产品数据并生成分析报告。"
      },
      {
        role: "user",
        content: `请分析以下与"${topic}"相关的产品数据，生成一份中文分析报告，包括产品概述、主要特点、市场潜力等方面：\n${JSON.stringify(products, null, 2)}`
      }
    ]
  });
  return completion.choices[0].message.content;
}

// 创建飞书文档
async function createFeishuDoc(title, content) {
  try {
    // 创建文档
    const response = await feishuClient.wiki.space.create({
      data: {
        title: title,
        content: content,
        folder_token: "your_folder_token" // 需要替换为实际的文件夹token
      }
    });
    return response.data;
  } catch (error) {
    console.error('创建飞书文档失败:', error);
    throw error;
  }
}

// 主函数
async function main(topic) {
  try {
    console.log(`开始研究主题: ${topic}`);
    
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
    allProducts = Array.from(new Set(allProducts.map(p => JSON.stringify(p)))).map(p => JSON.parse(p));
    console.log(`找到 ${allProducts.length} 个相关产品`);

    // 3. 使用GPT分析数据
    const analysis = await analyzeProducts(allProducts, topic);

    // 4. 创建飞书文档
    const docTitle = `产品调研报告: ${topic}`;
    await createFeishuDoc(docTitle, analysis);
    console.log('调研报告已生成并保存到飞书文档');

  } catch (error) {
    console.error('执行过程中出现错误:', error);
  }
}

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