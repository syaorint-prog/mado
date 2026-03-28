import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}
let rssCache: CacheEntry | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback mock data
const MOCK_ARTICLES = [
  {
    title: 'Windows 11の新機能が追加されました',
    link: 'https://forest.watch.impress.co.jp/docs/news/1',
    pubDate: new Date().toISOString(),
    guid: 'mock-1',
    thumbnail: 'https://placehold.co/200x150/009944/white?text=Windows',
  },
  {
    title: 'Chrome最新版がリリース、脆弱性を修正',
    link: 'https://forest.watch.impress.co.jp/docs/news/2',
    pubDate: new Date().toISOString(),
    guid: 'mock-2',
    thumbnail: 'https://placehold.co/200x150/009944/white?text=Chrome',
  }
];

// Helper function to fetch OG image from article page with timeout
async function fetchOGImage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // reduced to 2 sec

  try {
    const response = await fetch(url, { signal: controller.signal });
    const html = await response.text();

    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch && ogImageMatch[1]) return ogImageMatch[1];

    const twitterImageMatch = html.match(/<meta name="twitter:image:src" content="([^"]+)"/);
    if (twitterImageMatch && twitterImageMatch[1]) return twitterImageMatch[1];
  } catch (error) {
    // Ignore timeout warnings to unclutter logic
  } finally {
    clearTimeout(timeoutId);
  }

  return '';
}

async function performRssFetch() {
  const rssUrls = [
    'https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf',
    'https://forest.watch.impress.co.jp/docs/rss/index.rdf',
    'https://forest.watch.impress.co.jp/index.rdf',
  ];

  for (const url of rssUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      const xml = await res.text();
      const feed = await parser.parseString(xml);

      const maxDeepArticles = 10;
      
      const itemsWithImages = await Promise.all(
        feed.items.map(async (item: any, index: number) => {
          if (index < maxDeepArticles) {
            const ogImage = await fetchOGImage(item.link);
            return { ...item, _ogImage: ogImage };
          }
          return { ...item, _ogImage: '' };
        })
      );

      const articles = itemsWithImages.map((item: any) => {
        let thumbnail = item._ogImage || '';

        if (!thumbnail && item.enclosure?.url) {
          thumbnail = item.enclosure.url;
        } else if (!thumbnail && item['media:thumbnail']) {
          const mt = item['media:thumbnail'];
          thumbnail = mt['$']?.url || (typeof mt === 'string' ? mt : mt.url) || '';
        }
        
        if (!thumbnail && item.link) {
          const match = item.link.match(/\/(\d+)\.html$/);
          if (match && match[1].length >= 4) {
             thumbnail = `https://forest.watch.impress.co.jp/img/wf/list/${match[1].substring(0,4)}/${match[1].substring(4)}/og.png`;
          }
        }

        return {
          title: item.title || '',
          link: item.link || '',
          pubDate: item.pubDate || '',
          guid: item.guid || item.link || '',
          thumbnail,
        };
      });
      
      const responseData = { articles };
      rssCache = { data: responseData, timestamp: Date.now() };

      return NextResponse.json(responseData);
    } catch (error) {
      console.error(`Failed to fetch from ${url}:`, error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ articles: MOCK_ARTICLES });
}

export async function GET() {
  const now = Date.now();
  if (rssCache && (now - rssCache.timestamp < CACHE_TTL)) {
    return NextResponse.json(rssCache.data);
  }

  // Absolute fallback timeout at 7 seconds
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      console.warn('Absolute timeout reached, returning mock data immediately');
      resolve(NextResponse.json({ articles: MOCK_ARTICLES, error: 'timeout' }));
    }, 7000);
  });

  return Promise.race([performRssFetch(), timeoutPromise]);
}


