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

export default function Home() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('正在准备研究...');
  const [researchLoading, setResearchLoading] = useState<{ [key: string]: boolean }>({});
  const [deepResearch, setDeepResearch] = useState<{ [key: string]: string }>({});
  const [history, setHistory] = useState<ResearchHistory>({});
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

  // 加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('researchHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
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
      // 恢复深度研究结果
      const deepResearchData: { [key: string]: string } = {};
      historicalData.products.forEach(p => {
        if (p.deepResearch && p.website) {
          deepResearchData[p.website] = p.deepResearch;
        }
      });
      setDeepResearch(deepResearchData);
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
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error('研究请求失败');
      }

      const researchData = await response.json();
      setLoadingProgress(100);
      setLoadingMessage('研究完成！');
      setResult(researchData);
      saveToHistory(topic, researchData);
    } catch (error) {
      console.error('Error:', error);
      alert('研究过程中出现错误，请重试');
    } finally {
      setLoading(false);
    }
  };

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

        {/* 历史记录展示 */}
        {Object.keys(history).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">历史研究</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(history)
                .sort(([, a], [, b]) => b.timestamp - a.timestamp)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(([historyTopic, _]) => (
                  <button
                    key={historyTopic}
                    onClick={() => {
                      setTopic(historyTopic);
                      // 直接设置结果
                      const historicalData = history[historyTopic];
                      setResult({
                        content: '',
                        keywords: historicalData.keywords,
                        products: historicalData.products.map(p => ({
                          ...p,
                          deepResearch: undefined
                        }))
                      });
                      // 恢复深度研究结果
                      const deepResearchData: { [key: string]: string } = {};
                      historicalData.products.forEach(p => {
                        if (p.deepResearch && p.website) {
                          deepResearchData[p.website] = p.deepResearch;
                        }
                      });
                      setDeepResearch(deepResearchData);
                    }}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {historyTopic}
                  </button>
                ))}
            </div>
          </div>
        )}
        
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

        {result && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 space-y-8">
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
                      <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full shrink-0">
                        <span className="text-blue-800 dark:text-blue-100 text-sm">▲</span>
                        <span className="text-blue-800 dark:text-blue-100 font-medium text-sm">{product.votesCount}</span>
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

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>关键词</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">#{result.keywords.length}</span>
              </h2>
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
          </div>
        )}
      </div>
    </main>
  );
}
