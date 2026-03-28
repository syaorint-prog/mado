'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import NewsSidepanel from '@/components/NewsSidepanel';
import { ArticleWithReadState, FaceTexture, CompletedCube } from '@/types/article';

// Dynamically import Canvas components to avoid SSR issues
const Canvas = dynamic(() => import('@react-three/fiber').then((mod) => mod.Canvas), {
  ssr: false,
});

const CubeScene = dynamic(() => import('@/components/CubeScene'), {
  ssr: false,
});

const BlockStackScene = dynamic(() => import('@/components/BlockStackScene'), {
  ssr: false,
});

type CubeStatus = 'building' | 'ready' | 'splitting';

export default function Home() {
  const [faceTextures, setFaceTextures] = useState<FaceTexture[]>([]);
  const [completedCubes, setCompletedCubes] = useState<CompletedCube[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'stack'>('create');
  const [cubeStatus, setCubeStatus] = useState<CubeStatus>('building');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 6面すべて埋まったらready状態にする
  useEffect(() => {
    if (faceTextures.length === 6 && cubeStatus === 'building') {
      setCubeStatus('ready');
    }
  }, [faceTextures, cubeStatus]);

  const handleSplitComplete = () => {
    // 6つのテクスチャから、それぞれ1つのテクスチャを全面に貼った6個のキューブを生成
    const newCubes = faceTextures.map((faceTexture, index) => {
      // 1つの画像を全面(6面)に貼るための配列を作成
      const uniformFaceTextures: FaceTexture[] = Array.from({ length: 6 }).map((_, i) => ({
        faceIndex: i,
        imageUrl: faceTexture.imageUrl,
        title: faceTexture.title,
      }));

      return {
        id: `cube-${Date.now()}-${index}`,
        faceTextures: uniformFaceTextures,
        completedAt: new Date(Date.now() + index), // ソート用にミリ秒ずらす
      };
    });

    setCompletedCubes((prev) => [...prev, ...newCubes]);
    setFaceTextures([]); 
    setCubeStatus('building');
    setViewMode('stack');
  };

  const handleArticleClick = (article: ArticleWithReadState) => {
    if (cubeStatus !== 'building') return; // 分割中などは追加不可

    // Find the next available face (0-5)
    const usedFaces = faceTextures.map((ft) => ft.faceIndex);
    let nextFace = -1;

    for (let i = 0; i < 6; i++) {
      if (!usedFaces.includes(i)) {
        nextFace = i;
        break;
      }
    }

    if (nextFace === -1) {
      console.warn('All 6 faces are already filled!');
      return;
    }

    const newFaceTexture: FaceTexture = {
      faceIndex: nextFace,
      imageUrl: article.thumbnail || '',
      title: article.title,
    };

    setFaceTextures((prev) => [...prev, newFaceTexture]);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* UI Layer */}
      {isMounted && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setViewMode(viewMode === 'create' ? 'stack' : 'create')}
            className="bg-[#009944] hover:bg-[#00cc55] text-white px-6 py-3 rounded-full font-bold shadow-xl transition-all duration-200 flex items-center gap-3 border-4 border-white border-opacity-20"
          >
            {viewMode === 'create' ? (
              <>
                <span className="text-xl">📦</span>
                <span>ブロック積み上げを見る ({completedCubes.length})</span>
              </>
            ) : (
              <>
                <span className="text-xl">🪟</span>
                <span>キューブ作成に戻る</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3D Scene Layer */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          {isMounted && (
            <Canvas
              shadows
              gl={{ 
                preserveDrawingBuffer: true,
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
              }}
              camera={{ 
                position: viewMode === 'create' ? [6, 6, 6] : [0, 8, 15], 
                fov: 50 
              }}
              onCreated={({ gl }) => {
                gl.setClearColor('#eef6f0', 1);
              }}
            >
              {viewMode === 'create' ? (
                <CubeScene 
                  faceTextures={faceTextures} 
                  isSplitting={cubeStatus === 'splitting'}
                  onSplitComplete={handleSplitComplete}
                />
              ) : (
                <BlockStackScene completedCubes={completedCubes} />
              )}
            </Canvas>
          )}
        </Suspense>
      </div>

      {/* Overlay Layer */}
      {viewMode === 'create' ? (
        <>
          <NewsSidepanel onArticleClick={handleArticleClick} />
          {isMounted && (
            <div className="absolute top-4 left-4 z-10 max-w-sm pointer-events-none">
              <div className="bg-black/70 text-white p-4 rounded-lg">
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <span>🪟</span>
                  <span>匣の杜RSSリーダー</span>
                </h1>
                <p className="text-sm text-gray-300">
                  右のニュースをクリックして、キューブの面を埋めましょう。
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  表示された面: {faceTextures.length}/6
                </div>
              </div>
            </div>
          )}

          {/* Splitting Overlay */}
          {cubeStatus === 'ready' && isMounted && (
            <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center backdrop-blur-sm">
              <button
                onClick={() => setCubeStatus('splitting')}
                className="bg-white text-[#009944] hover:bg-green-50 px-8 py-4 rounded-xl font-extrabold text-2xl shadow-2xl transition-all duration-300 hover:scale-110 flex flex-col items-center gap-2 border-4 border-[#009944]"
              >
                <span>✨ 完成しました！ ✨</span>
                <span className="text-base text-gray-600">クリックして6個のブロックに分割</span>
              </button>
            </div>
          )}
        </>
      ) : (
        isMounted && (
          <div className="absolute top-4 left-4 z-10 max-w-sm pointer-events-none">
            <div className="bg-black/70 text-white p-4 rounded-lg">
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span>📦</span>
                <span>ブロック積み上げ</span>
              </h1>
              <p className="text-sm text-gray-300">
                完成したキューブのコレクションです。
              </p>
              <div className="mt-2 text-xs text-gray-400">
                積み上げたブロック: {completedCubes.length}個
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

