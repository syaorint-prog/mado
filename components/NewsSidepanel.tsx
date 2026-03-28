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

  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);
  const [articleBody, setArticleBody] = useState<string | null>(null);
  const [fetchingBody, setFetchingBody] = useState(false);

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

  const handleArticleClick = async (index: number) => {
    // スライドして詳細ビューを開く
    setSelectedArticleIndex(index);
    setArticleBody(null);
    setFetchingBody(true);

    try {
      const article = articles[index];
      const res = await fetch(`/api/article?url=${encodeURIComponent(article.link)}`);
      const data = await res.json();
      setArticleBody(data.text);
    } catch (err) {
      console.error('Failed to fetch article body:', err);
      setArticleBody("本文の取得に失敗しました。元のサイトを開いてお読みください。");
    } finally {
      setFetchingBody(false);
    }
  };

  const handleReadConfirm = () => {
    if (selectedArticleIndex === null) return;
    
    const article = articles[selectedArticleIndex];
    
    // Mark as read
    setArticles((prev) =>
      prev.map((a, i) => (i === selectedArticleIndex ? { ...a, isRead: true } : a))
    );

    // Trigger cube generation
    onArticleClick(article);
    
    // スライドしてリストビューに戻る
    setSelectedArticleIndex(null);
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

  const selectedArticle = selectedArticleIndex !== null ? articles[selectedArticleIndex] : null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l-4 border-[#009944] shadow-lg overflow-hidden flex flex-col z-30">
      <div 
        className="flex h-full w-[200%] transition-transform duration-300 ease-in-out"
        style={{ transform: selectedArticleIndex !== null ? 'translateX(-50%)' : 'translateX(0)' }}
      >
        {/* Pane 1: List View */}
        <div className="w-80 h-full flex flex-col flex-shrink-0 relative">
          {/* Header */}
          <div className="bg-[#009944] text-white p-4 font-bold text-lg flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪟</span>
              <span>RSSリーダー匣の杜</span>
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
                onClick={() => handleArticleClick(index)}
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
            ニュースをクリックして記事を読む
          </div>
        </div>

        {/* Pane 2: Detail View */}
        <div className="w-80 h-full flex flex-col flex-shrink-0 relative bg-gray-50">
          {/* Detail Header */}
          <div className="bg-[#009944] text-white p-3 shadow-md flex items-center sticky top-0 z-10">
            <button 
              onClick={() => setSelectedArticleIndex(null)}
              className="mr-3 p-1 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-bold flex-1 text-sm truncate">ニュース詳細</span>
          </div>
          
          {selectedArticle ? (
            <div className="flex-1 overflow-y-auto w-full">
              <div className="bg-white m-3 rounded shadow-sm border border-gray-200 overflow-hidden">
                {selectedArticle.thumbnail && (
                  <div className="w-full h-40 bg-gray-100 relative">
                    <img 
                      src={selectedArticle.thumbnail} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-lg font-bold text-gray-800 leading-snug mb-2">
                    {selectedArticle.title}
                  </h2>
                  <div className="text-[11px] text-gray-400 mb-4 border-b pb-2">
                    {new Date(selectedArticle.pubDate).toLocaleString('ja-JP', {
                      year: 'numeric', month: 'numeric', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  
                  {selectedArticle.contentSnippet && selectedArticle.contentSnippet !== '概要がありません' && (
                    <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap mb-4 pb-4 border-b border-gray-100">
                      【概要】<br/>
                      {selectedArticle.contentSnippet}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {fetchingBody ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                        <span className="animate-spin text-2xl">🔄</span>
                        <span className="text-xs">本文を取得中...</span>
                      </div>
                    ) : (
                      articleBody || "本文が見つかりませんでした。"
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              記事が選択されていません
            </div>
          )}

          {/* Action Footer */}
          <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button
              onClick={handleReadConfirm}
              className="w-full bg-[#009944] hover:bg-[#00cc55] active:bg-[#007733] text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedArticle?.isRead}
            >
              <span className="text-2xl">📝</span>
              {selectedArticle?.isRead ? '読み込み済み' : '読んだ（ブロック生成）'}
            </button>
            <a 
              href={selectedArticle?.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-3 block text-center text-sm text-[#009944] font-bold hover:underline"
            >
              元のサイトで記事を読む ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

