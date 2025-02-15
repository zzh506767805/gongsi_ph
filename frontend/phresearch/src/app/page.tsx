'use client';

import { useState } from 'react';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('正在准备研究...');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('正在准备研究...');
    try {
      const response = await fetch('http://localhost:3001/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error('研究请求失败');
      }

      const data = await response.json();
      setLoadingProgress(100);
      setLoadingMessage('研究完成！');
      setResult(data);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">市场洞察</h3>
            <p className="text-gray-600 dark:text-gray-400">智能分析市场趋势和用户需求，发现产品机会</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">竞品分析</h3>
            <p className="text-gray-600 dark:text-gray-400">深入了解竞品优势和特点，制定差异化策略</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">创新建议</h3>
            <p className="text-gray-600 dark:text-gray-400">基于AI分析，提供产品创新和改进建议</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入要研究的产品主题，例如：CRM"
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
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex flex-col min-h-[320px]"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 flex-1 pr-3">{product.name}</h3>
                    <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full shrink-0">
                      <span className="text-blue-800 dark:text-blue-100 text-sm">▲</span>
                      <span className="text-blue-800 dark:text-blue-100 font-medium text-sm">{product.votesCount}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1.5 line-clamp-3">{product.tagline}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-5">{product.description}</p>
                  <div className="mt-auto space-y-3">
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
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center group"
                      >
                        <span>在 ProductHunt 查看</span>
                        <span className="transform transition-transform group-hover:translate-x-1 ml-1">→</span>
                      </a>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
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

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">分析报告</h2>
                <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  {result.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700 dark:text-gray-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
