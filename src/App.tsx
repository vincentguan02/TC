/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Percent,
  History,
  Layers,
  Calculator,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { CalcMode, RebateConfig, BetRecord } from './types';
import {
  getStoredRebateConfig,
  saveStoredRebateConfig,
  getStoredHistory,
  saveStoredHistory,
  DEFAULT_REBATE,
} from './utils/storage';
import { GoalCountCalculator } from './components/GoalCountCalculator';
import { ParlayCoverCalculator } from './components/ParlayCoverCalculator';
import { SingleMatchCalculator } from './components/SingleMatchCalculator';
import { HistoryAndAnalytics } from './components/HistoryAndAnalytics';
import { RebateModal } from './components/RebateModal';

export default function App() {
  const [mode, setMode] = useState<CalcMode>('goals');
  const [rebateConfig, setRebateConfig] = useState<RebateConfig>(DEFAULT_REBATE);
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [isRebateModalOpen, setIsRebateModalOpen] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(false);

  // Initialize data from local storage
  useEffect(() => {
    setRebateConfig(getStoredRebateConfig());
    setHistory(getStoredHistory());
  }, []);

  const handleSaveRebateConfig = (newConfig: RebateConfig) => {
    setRebateConfig(newConfig);
    saveStoredRebateConfig(newConfig);
  };

  const handleSaveRecord = (
    newRecord: Omit<BetRecord, 'id' | 'timestamp' | 'createdAtStr'>
  ) => {
    const now = Date.now();
    const dateStr = new Date(now).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const fullRecord: BetRecord = {
      ...newRecord,
      id: `bet-${now}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      createdAtStr: dateStr,
    };

    const updated = [fullRecord, ...history];
    setHistory(updated);
    saveStoredHistory(updated);
  };

  const handleUpdateHistory = (updatedList: BetRecord[]) => {
    setHistory(updatedList);
    saveStoredHistory(updatedList);
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveStoredHistory([]);
  };

  const getTitle = () => {
    switch (mode) {
      case 'goals':
        return '进球数计算';
      case 'parlay':
        return '全包计算';
      case 'single':
        return '单关对冲';
      case 'history':
        return '历史与盈亏分析';
      default:
        return '对冲计算器';
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f2fb] text-slate-900 flex flex-col font-sans w-full overflow-x-hidden">
      {/* Top Header Bar (Exact Purple Gradient Style from Screenshot 1 & 2) */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-800 via-purple-900 to-purple-800 text-white shadow-md pt-safe">
        <div className="max-w-xl mx-auto px-3 sm:px-4 h-13 sm:h-14 flex items-center justify-between">
          {/* Left Slot: Back Arrow */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (mode !== 'goals') setMode('goals');
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors -ml-1 text-purple-100"
              title="返回首页"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Center Title */}
          <h1 className="text-base sm:text-lg font-bold tracking-wide text-white text-center select-none truncate px-2">
            {getTitle()}
          </h1>

          {/* Right Action: Rebate Button & View Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsRebateModalOpen(true)}
              className="flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium px-2 sm:px-2.5 py-1.5 rounded-xl transition-all"
              title="设置返点比例"
            >
              <Percent className="w-3.5 h-3.5 text-amber-300" />
              <span>返点</span>
            </button>

            {/* Desktop frame preview toggle (hidden on real phones) */}
            <button
              onClick={() => setIsMobileFrameView(!isMobileFrameView)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 transition-colors"
              title={isMobileFrameView ? '切换宽屏' : '切换移动端视口'}
            >
              {isMobileFrameView ? (
                <Monitor className="w-4 h-4" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs Strip (Clean 4-column layout on mobile, no horizontal overflow) */}
        <div className="bg-purple-950/50 border-t border-purple-700/50 px-2 py-1.5">
          <div className="max-w-xl mx-auto grid grid-cols-4 gap-1 text-xs font-medium">
            <button
              onClick={() => setMode('goals')}
              className={`py-1.5 px-1 rounded-xl text-center whitespace-nowrap transition-all text-[11px] sm:text-xs font-semibold ${
                mode === 'goals'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              进球数
            </button>

            <button
              onClick={() => setMode('parlay')}
              className={`py-1.5 px-1 rounded-xl text-center whitespace-nowrap transition-all text-[11px] sm:text-xs font-semibold ${
                mode === 'parlay'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              全包串关
            </button>

            <button
              onClick={() => setMode('single')}
              className={`py-1.5 px-1 rounded-xl text-center whitespace-nowrap transition-all text-[11px] sm:text-xs font-semibold ${
                mode === 'single'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              单关对冲
            </button>

            <button
              onClick={() => setMode('history')}
              className={`py-1.5 px-1 rounded-xl text-center whitespace-nowrap transition-all flex items-center justify-center gap-0.5 text-[11px] sm:text-xs font-semibold ${
                mode === 'history'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>盈亏分析</span>
              {history.length > 0 && (
                <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                  mode === 'history' ? 'bg-purple-100 text-purple-900' : 'bg-purple-800 text-purple-100'
                }`}>
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Compact edge padding for mobile screens) */}
      <main
        className={`flex-1 px-2.5 py-3 sm:px-4 sm:py-4 transition-all ${
          isMobileFrameView
            ? 'max-w-[420px] mx-auto my-4 bg-white/60 rounded-3xl shadow-xl border border-purple-200/60 p-4'
            : 'max-w-xl mx-auto w-full'
        }`}
      >
        {mode === 'goals' && (
          <GoalCountCalculator
            rebateConfig={rebateConfig}
            onOpenRebateModal={() => setIsRebateModalOpen(true)}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {mode === 'parlay' && (
          <ParlayCoverCalculator
            rebateConfig={rebateConfig}
            onOpenRebateModal={() => setIsRebateModalOpen(true)}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {mode === 'single' && (
          <SingleMatchCalculator
            rebateConfig={rebateConfig}
            onOpenRebateModal={() => setIsRebateModalOpen(true)}
            onSaveRecord={handleSaveRecord}
          />
        )}

        {mode === 'history' && (
          <HistoryAndAnalytics
            history={history}
            onUpdateHistory={handleUpdateHistory}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Rebate Modal */}
      <RebateModal
        isOpen={isRebateModalOpen}
        onClose={() => setIsRebateModalOpen(false)}
        config={rebateConfig}
        onSave={handleSaveRebateConfig}
      />
    </div>
  );
}
