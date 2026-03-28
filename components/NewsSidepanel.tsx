'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArticleWithReadState } from '@/types/article';

interface NewsSidepanelProps {
  onArticleClick: (article: ArticleWithReadState) => void;
}

export default function NewsSidepanel({ onArticleClick }: NewsSidepanelProps) {
  const [articles, setArticles] = useState<ArticleWithReadState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/rss');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setArticles(
        data.articles.map((article: any) => ({
          ...article,
          isRead: false,
        }))
      );
      setRetryCount(0); // Reset on success
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Auto-retry once
      if (retryCount < 1) {
        console.log('Auto-retrying fetch...');
        setRetryCount(prev => prev + 1);
        setTimeout(fetchArticles, 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleArticleClick = (article: ArticleWithReadState, index: number) => {
    // Mark as read
    setArticles((prev) =>
      prev.map((a, i) => (i === index ? { ...a, isRead: true } : a))
    );

    // Trigger cube generation
    onArticleClick(article);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l-4 border-[#009944] shadow-lg p-4 z-30">
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
          <div className="animate-spin text-4xl">🔄</div>
          <div>ニュースを取得中...</div>
        </div>
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l-4 border-[#009944] shadow-lg p-4 z-30 flex flex-col justify-center items-center text-center gap-4">
        <div className="text-red-500 font-bold">ニュースの取得に失敗しました</div>
        <div className="text-xs text-gray-400 px-4">{error}</div>
        <button 
          onClick={() => fetchArticles()}
          className="bg-[#009944] hover:bg-[#00cc55] text-white px-4 py-2 rounded transition-colors text-sm font-bold"
        >
          再試行する
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l-4 border-[#009944] shadow-lg overflow-hidden flex flex-col z-30">
      {/* Header */}
      <div className="bg-[#009944] text-white p-4 font-bold text-lg flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪟</span>
          <span>窓の杜 ニュース</span>
        </div>
        <button 
          onClick={() => fetchArticles()}
          disabled={loading}
          className={`text-white/80 hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
          title="更新"
        >
          <span className="text-xl">🔄</span>
        </button>
      </div>

      {/* News List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {articles.map((article, index) => (
          <div
            key={article.guid}
            onClick={() => handleArticleClick(article, index)}
            className={`
              border-2 border-gray-200 rounded cursor-pointer overflow-hidden
              transition-all duration-200 hover:border-[#009944] hover:shadow-sm
              ${article.isRead ? 'bg-gray-100 opacity-60' : 'bg-white hover:bg-green-50'}
            `}
          >
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              {article.thumbnail ? (
                <div className="flex-shrink-0">
                  <img
                    src={article.thumbnail}
                    alt={article.title}
                    className="w-20 h-20 object-cover rounded bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-[#009944] to-[#00cc55] rounded flex items-center justify-center">
                  <span className="text-white text-3xl">🪟</span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold leading-snug line-clamp-3 ${article.isRead ? 'text-gray-500' : 'text-gray-800'}`}>
                  {article.title}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {new Date(article.pubDate).toLocaleString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-3 text-center text-[10px] text-gray-400 border-t border-gray-100">
        クリックで立方体の面に表示されます
      </div>
    </div>
  );
}

