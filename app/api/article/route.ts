import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const maxDuration = 60; // Allow function to run up to 60 seconds on Vercel

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ text: '' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Remove unwanted functional elements
    $('script, style, iframe, nav, footer, header').remove();
    // Also remove generic sidebars or ad containers which might exist
    $('.ad, .sidebar, aside').remove();
    
    // Extract main text from Impress Watch
    let bodyText = '';
    
    if ($('.article-body').length > 0) {
      // Typically used by impress watch
      bodyText = $('.article-body').text();
    } else if ($('article').length > 0) {
      bodyText = $('article').text();
    } else if ($('main').length > 0) {
      bodyText = $('main').text();
    } else {
      bodyText = $('body').text();
    }
    
    // Clean up excessive whitespace
    bodyText = bodyText.replace(/\s+/g, '\n\n').trim();
    
    return NextResponse.json({ text: bodyText });
  } catch (error) {
    console.error(`Failed to fetch and process article from ${url}:`, error);
    return NextResponse.json({ text: '本文の取得に失敗しました。元のサイトを開いてお読みください。' }, { status: 500 });
  }
}
