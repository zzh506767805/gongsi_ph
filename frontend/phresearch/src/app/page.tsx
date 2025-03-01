'use client';

import { useState, useEffect } from 'react';

// 历史记录类型定义
type ResearchHistory = {
  [topic: string]: {
    timestamp: number;
    keywords: string[];
    products: Array<{
      name: string;
      tagline: string;
      description: string;
      url: string;
      votesCount: number;
      website?: string;
      createdAt: string;
      topics: string[];
      deepResearch?: string;
    }>;
  };
};

// 收藏夹类型定义
type Favorite = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  votesCount: number;
  website?: string;
  createdAt: string;
  topics: string[];
  deepResearch?: string;
  addedAt: number;
};

// 关键词权重类型定义
type KeywordWeight = {
  keyword: string;
  count: number;
};

export default function Home() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('正在准备研究...');
  const [researchLoading, setResearchLoading] = useState<{ [key: string]: boolean }>({});
  const [deepResearch, setDeepResearch] = useState<{ [key: string]: string }>({});
  const [history, setHistory] = useState<ResearchHistory>({});
  const [favorites, setFavorites] = useState<{ [key: string]: Favorite }>({});
  const [showFavorites, setShowFavorites] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    keywords: string[];
    products: Array<{
      name: string;
      tagline: string;
      description: string;
      url: string;
      votesCount: number;
      website?: string;
      createdAt: string;
      topics: string[];
    }>;
  } | null>(null);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [keywordWeights, setKeywordWeights] = useState<KeywordWeight[]>([]);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 从历史记录中提取所有深度研究结果
  const getAllDeepResearch = () => {
    const allDeepResearch: { [key: string]: string } = {};
    Object.values(history).forEach(record => {
      record.products.forEach(product => {
        if (product.website && product.deepResearch) {
          allDeepResearch[product.website] = product.deepResearch;
        }
      });
    });
    return allDeepResearch;
  };

  // 加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('researchHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory) as ResearchHistory;
      setHistory(parsedHistory);
      // 初始化时加载所有深度研究结果
      const allDeepResearch = Object.values(parsedHistory).reduce<{ [key: string]: string }>((acc, record) => {
        record.products.forEach((product) => {
          if (product.website && product.deepResearch) {
            acc[product.website] = product.deepResearch;
          }
        });
        return acc;
      }, {});
      setDeepResearch(allDeepResearch);
    }

    // 加载收藏夹
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // 保存历史记录
  const saveToHistory = (topic: string, data: {
    keywords: string[];
    products: Array<{
      name: string;
      tagline: string;
      description: string;
      url: string;
      votesCount: number;
      website?: string;
      createdAt: string;
      topics: string[];
    }>;
  }, deepResearchData?: { [key: string]: string }) => {
    const newHistory = {
      ...history,
      [topic]: {
        timestamp: Date.now(),
        keywords: data.keywords,
        products: data.products.map((product) => ({
          ...product,
          deepResearch: deepResearchData?.[product.website || '']
        }))
      }
    };
    setHistory(newHistory);
    localStorage.setItem('researchHistory', JSON.stringify(newHistory));
  };

  // 获取重定向后的实际URL
  const getActualUrl = async (url: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/get-actual-url?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('获取URL失败');
      }
      const data = await response.json();
      return data.url as string;
    } catch (error) {
      console.error('获取实际URL失败:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    // 检查历史记录
    if (history[topic]) {
      const historicalData = history[topic];
      setResult({
        content: '',
        keywords: historicalData.keywords,
        products: historicalData.products.map(p => ({
          ...p,
          deepResearch: undefined
        }))
      });
      // 加载所有深度研究结果
      setDeepResearch(getAllDeepResearch());
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('正在准备研究...');
    try {
      const response = await fetch('http://localhost:3002/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic,
          existingResearch: getAllDeepResearch(),
        }),
      });

      if (!response.ok) {
        throw new Error('研究请求失败');
      }

      const researchData = await response.json();
      setLoadingProgress(100);
      setLoadingMessage('研究完成！');
      setResult(researchData);

      // 如果有深度研究结果，也要设置到 deepResearch 状态中
      const deepResearchData: { [key: string]: string } = {};
      researchData.products.forEach((product: {
        website?: string;
        deepResearch?: string;
      }) => {
        if (product.website && product.deepResearch) {
          deepResearchData[product.website] = product.deepResearch;
        }
      });
      setDeepResearch(prev => ({
        ...prev,
        ...deepResearchData
      }));

      // 保存到历史记录，但不包含深度研究结果
      const productsWithoutDeepResearch = researchData.products.map((p: {
        name: string;
        tagline: string;
        description: string;
        url: string;
        votesCount: number;
        website?: string;
        createdAt: string;
        topics: string[];
        deepResearch?: string;
      }) => ({
        ...p,
        deepResearch: undefined
      }));
      saveToHistory(topic, {
        ...researchData,
        products: productsWithoutDeepResearch
      });
    } catch (error) {
      console.error('Error:', error);
      alert('研究过程中出现错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改历史记录按钮的点击处理函数
  const handleHistoryClick = (historyTopic: string) => {
    setTopic(historyTopic);
    const historicalData = history[historyTopic];
    setResult({
      content: '',
      keywords: historicalData.keywords,
      products: historicalData.products.map(p => ({
        ...p,
        deepResearch: undefined
      }))
    });
  };

  // 切换收藏状态
  const toggleFavorite = (product: {
    name: string;
    tagline: string;
    description: string;
    url: string;
    votesCount: number;
    website?: string;
    createdAt: string;
    topics: string[];
    deepResearch?: string;
  }) => {
    setFavorites(prev => {
      const key = product.website || product.url;
      const newFavorites = { ...prev };
      
      if (newFavorites[key]) {
        delete newFavorites[key];
      } else {
        // 收藏时，同时保存深度研究结果
        const websiteKey = product.website || '';
        newFavorites[key] = {
          ...product,
          deepResearch: deepResearch[websiteKey] || product.deepResearch,
          addedAt: Date.now()
        };
      }
      
      // 保存到本地存储
      localStorage.setItem('favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // 检查是否已收藏
  const isFavorited = (product: { website?: string; url: string }) => {
    const key = product.website || product.url;
    return !!favorites[key];
  };

  // 使用调整后的关键词重新研究
  const handleReresearch = async () => {
    if (!topic) return;
    setIsAdjusting(true);
    try {
      // 过滤掉空关键词
      const validKeywords = keywordWeights.filter(kw => kw.keyword.trim() !== '');
      if (validKeywords.length === 0) {
        alert('请至少保留一个有效的关键词');
        return;
      }

      const response = await fetch('http://localhost:3002/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic,
          existingResearch: getAllDeepResearch(),
          skipKeywordGeneration: true,
          keywordWeights: validKeywords.reduce((acc, kw) => {
            if (kw.keyword.trim()) {
              acc[kw.keyword.trim()] = kw.count;
            }
            return acc;
          }, {} as { [key: string]: number })
        }),
      });

      if (!response.ok) {
        throw new Error('研究请求失败');
      }

      const researchData = await response.json();
      researchData.keywords = validKeywords.map(kw => kw.keyword.trim());
      setResult(researchData);
      setShowKeywordModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert('研究过程中出现错误，请重试');
    } finally {
      setIsAdjusting(false);
    }
  };

  // 更新关键词权重
  const updateKeywordWeight = (index: number, count: number) => {
    setKeywordWeights(prev => {
      const newWeights = [...prev];
      newWeights[index] = { ...newWeights[index], count };
      return newWeights;
    });
  };

  // 删除关键词
  const removeKeyword = (index: number) => {
    setKeywordWeights(prev => prev.filter((_, i) => i !== index));
  };

  // 添加新关键词
  const addKeyword = () => {
    setKeywordWeights(prev => [...prev, { keyword: '', count: 10 }]);
  };

  // 当结果更新时，初始化关键词权重
  useEffect(() => {
    if (result && (!keywordWeights.length || !keywordWeights.every(kw => result.keywords.includes(kw.keyword)))) {
      // 只在首次获取结果或关键词列表发生变化时初始化权重
      setKeywordWeights(result.keywords.map(keyword => ({
        keyword,
        count: 10 // 默认每个关键词搜索10个结果
      })));
    }
  }, [result?.keywords]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">产品研究助手</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">基于 AI 的智能产品研究工具</p>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            结合 ProductHunt 海量数据和 GPT 智能分析，帮助您快速了解市场动态、竞品分析和创新机会
          </p>
        </div>

        {/* 导航栏 */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowFavorites(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !showFavorites
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            研究历史
          </button>
          <button
            onClick={() => setShowFavorites(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showFavorites
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            我的收藏
          </button>
          </div>

        {/* 历史记录展示 */}
        {!showFavorites && Object.keys(history).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">历史研究</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(history)
                .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(([historyTopic, _]) => (
                  <button
                    key={historyTopic}
                    onClick={() => handleHistoryClick(historyTopic)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {historyTopic}
                  </button>
                ))}
          </div>
          </div>
        )}
        
        {!showFavorites && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入要研究的产品主题，例如：一个智能获客系统，通过SEO和内容管理带来线索"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-blue-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? '研究中...' : '开始研究'}
            </button>
          </div>
          {loading && (
            <div className="mt-4 space-y-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-600 dark:text-gray-400">{loadingMessage}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">预计需要1分钟左右，您可以先休息一下 ☕️</p>
              </div>
            </div>
          )}
        </form>
        )}

        {/* 研究结果展示 */}
        {!showFavorites && result && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 space-y-8">
            {/* 关键词部分 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <span>关键词</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">#{result.keywords.length}</span>
                </h2>
                <button
                  onClick={() => setShowKeywordModal(true)}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  调整关键词权重
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-default"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* 产品卡片网格 */}
            <div className="grid gap-6 md:grid-cols-3">
              {result.products
                .sort((a, b) => b.votesCount - a.votesCount)
                .map((product, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex flex-col"
                >
                  <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 flex-1 pr-3">{product.name}</h3>
                      <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full shrink-0">
                      <span className="text-blue-800 dark:text-blue-100 text-sm">▲</span>
                      <span className="text-blue-800 dark:text-blue-100 font-medium text-sm">{product.votesCount}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(product);
                          }}
                          className={`text-sm px-2 py-1 rounded-full transition-colors ${
                            isFavorited(product)
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {isFavorited(product) ? '★' : '☆'}
                        </button>
                    </div>
                  </div>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{product.tagline}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-5">{product.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.topics?.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    {deepResearch[product.website || ''] && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {deepResearch[product.website || '']}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center group"
                      >
                        <span>在 ProductHunt 查看</span>
                        <span className="transform transition-transform group-hover:translate-x-1 ml-1">→</span>
                      </a>
                        <button
                          onClick={async () => {
                            if (researchLoading[product.website || ''] || !product.website) return;
                            
                            setResearchLoading(prev => ({ ...prev, [product.website || '']: true }));
                            try {
                              // 先获取实际URL
                              const actualUrl = await getActualUrl(product.website);
                              if (!actualUrl) {
                                throw new Error('该网站可能已不可用');
                              }

                              const response = await fetch('http://localhost:3002/api/deep-research', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ url: actualUrl })
                              });
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message);
                              }

                              const data = await response.json();
                              setDeepResearch(prev => ({ ...prev, [product.website || '']: data.output }));
                              // 更新历史记录中的深度研究数据
                              if (topic && result) {
                                saveToHistory(topic, result, {
                                  ...deepResearch,
                                  [product.website || '']: data.output
                                });
                              }
                            } catch (error) {
                              console.error('深度研究请求失败:', error);
                              alert('深度研究失败: ' + (error instanceof Error ? error.message : '未知错误'));
                            } finally {
                              setResearchLoading(prev => ({ ...prev, [product.website || '']: false }));
                            }
                          }}
                          disabled={researchLoading[product.website || '']}
                          className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {researchLoading[product.website || ''] ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                              </svg>
                              <span>分析中...</span>
                            </>
                          ) : (
                            <>
                              <span>深度研究</span>
                              {deepResearch[product.website || ''] && '✓'}
                            </>
                          )}
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关键词权重调整弹窗 */}
        {showKeywordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">调整关键词权重</h3>
                  <button
                    onClick={() => setShowKeywordModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  {keywordWeights.map((kw, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <input
                        type="text"
                        value={kw.keyword}
                        onChange={(e) => {
                          const newWeights = [...keywordWeights];
                          newWeights[index].keyword = e.target.value;
                          setKeywordWeights(newWeights);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="输入关键词"
                      />
                      <input
                        type="number"
                        value={kw.count}
                        onChange={(e) => updateKeywordWeight(index, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        min="1"
                      />
                      <button
                        onClick={() => removeKeyword(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    + 添加关键词
                  </button>
                  <div className="space-x-4">
                    <button
                      onClick={() => setShowKeywordModal(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleReresearch}
                      disabled={isAdjusting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdjusting ? '研究中...' : '重新研究'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 收藏夹展示 */}
        {showFavorites && Object.keys(favorites).length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              {Object.values(favorites)
                .sort((a, b) => b.addedAt - a.addedAt)
                .map((product, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex flex-col"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 flex-1 pr-3">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full shrink-0">
                          <span className="text-blue-800 dark:text-blue-100 text-sm">▲</span>
                          <span className="text-blue-800 dark:text-blue-100 font-medium text-sm">{product.votesCount}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(product);
                          }}
                          className={`text-sm px-2 py-1 rounded-full transition-colors ${
                            isFavorited(product)
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {isFavorited(product) ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{product.tagline}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-5">{product.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.topics?.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    {product.deepResearch && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {product.deepResearch}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center group"
                        >
                          <span>在 ProductHunt 查看</span>
                          <span className="transform transition-transform group-hover:translate-x-1 ml-1">→</span>
                        </a>
                        <button
                          onClick={async () => {
                            if (researchLoading[product.website || ''] || !product.website) return;
                            
                            setResearchLoading(prev => ({ ...prev, [product.website || '']: true }));
                            try {
                              // 先获取实际URL
                              const actualUrl = await getActualUrl(product.website);
                              if (!actualUrl) {
                                throw new Error('该网站可能已不可用');
                              }

                              const response = await fetch('http://localhost:3002/api/deep-research', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ url: actualUrl })
                              });
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message);
                              }

                              const data = await response.json();
                              setDeepResearch(prev => ({ ...prev, [product.website || '']: data.output }));
                              // 更新历史记录中的深度研究数据
                              if (topic && result) {
                                saveToHistory(topic, result, {
                                  ...deepResearch,
                                  [product.website || '']: data.output
                                });
                              }
                            } catch (error) {
                              console.error('深度研究请求失败:', error);
                              alert('深度研究失败: ' + (error instanceof Error ? error.message : '未知错误'));
                            } finally {
                              setResearchLoading(prev => ({ ...prev, [product.website || '']: false }));
                            }
                          }}
                          disabled={researchLoading[product.website || '']}
                          className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {researchLoading[product.website || ''] ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                              </svg>
                              <span>分析中...</span>
                            </>
                          ) : (
                            <>
                              <span>深度研究</span>
                              {deepResearch[product.website || ''] && '✓'}
                            </>
                          )}
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空收藏夹提示 */}
        {showFavorites && Object.keys(favorites).length === 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              还没有收藏任何产品，在研究结果中点击收藏按钮来添加收藏
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
