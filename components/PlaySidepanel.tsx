import React from 'react';
import { ShapeType } from '@/lib/shapes';

interface PlaySidepanelProps {
  onSelectShape: (shape: ShapeType | null) => void;
  currentShape: ShapeType | null;
  onClose: () => void;
}

export default function PlaySidepanel({ onSelectShape, currentShape, onClose }: PlaySidepanelProps) {
  return (
    <div className="h-screen w-full bg-white border-l-4 border-[#009944] shadow-lg flex flex-col z-30 slide-in-right">
      {/* Header */}
      <div className="bg-[#009944] text-white p-4 font-bold text-xl flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧩</span>
          <span>ブロックで遊ぶ</span>
        </div>
        <button 
          onClick={onClose}
          className="hover:bg-white/20 p-2 rounded-full transition-colors"
          title="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div className="text-gray-600 font-bold mb-2">
          好きな形を選ぶと、これまで作ったニュースブロックと色ブロックが自動で組み上がります！
        </div>

        {/* Robot Button */}
        <button
          onClick={() => onSelectShape('robot')}
          className={`flex flex-col items-center justify-center p-8 rounded-xl border-4 transition-all duration-300 shadow-md transform hover:scale-105 ${
            currentShape === 'robot' 
              ? 'border-[#009944] bg-green-50 shadow-inner' 
              : 'border-gray-200 hover:border-[#00cc55] hover:bg-gray-50'
          }`}
        >
          <span className="text-6xl mb-4">🤖</span>
          <span className="text-2xl font-extrabold text-gray-800">ロボット</span>
        </button>

        {/* Car Button */}
        <button
          onClick={() => onSelectShape('car')}
          className={`flex flex-col items-center justify-center p-8 rounded-xl border-4 transition-all duration-300 shadow-md transform hover:scale-105 ${
            currentShape === 'car' 
              ? 'border-[#009944] bg-green-50 shadow-inner' 
              : 'border-gray-200 hover:border-[#00cc55] hover:bg-gray-50'
          }`}
        >
          <span className="text-6xl mb-4">🚗</span>
          <span className="text-2xl font-extrabold text-gray-800">クルマ</span>
        </button>

        {/* Reset Button */}
        {currentShape && (
          <button
            onClick={() => onSelectShape(null)}
            className="mt-4 p-4 text-[#009944] font-bold border-2 border-[#009944] rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">💥</span>
            元に戻す（崩す）
          </button>
        )}
      </div>

      <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
        作成した知識ブロックが形になります
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
