import React, { useState } from 'react';
import {
  Plus,
  Minus,
  RotateCcw,
  Copy,
  Check,
  BookmarkPlus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Percent,
  Layers,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { SingleCoverRow, RebateConfig, BetRecord } from '../types';
import {
  evaluateSingleCoverCurrentStakes,
  solveOptimalSingleCoverStakes,
  formatJcTicketSlip,
  formatHgBetSlip,
} from '../utils/calculator';

interface SingleMatchCalculatorProps {
  rebateConfig: RebateConfig;
  onOpenRebateModal: () => void;
  onSaveRecord: (record: Omit<BetRecord, 'id' | 'timestamp' | 'createdAtStr'>) => void;
}

const INITIAL_ROWS: SingleCoverRow[] = [
  {
    id: 'sc-1',
    source: 'jc',
    marketName: '竞彩 主胜',
    pick: '主胜',
    odds: 2.15,
    stake: 10000.0,
    rebateRate: 7.0,
  },
  {
    id: 'sc-2',
    source: 'hg',
    marketName: '皇冠 客+0.5',
    pick: '客+0.5',
    odds: 1.95,
    stake: 11025.64,
    rebateRate: 0.8,
  },
];

export const SingleMatchCalculator: React.FC<SingleMatchCalculatorProps> = ({
  rebateConfig,
  onOpenRebateModal,
  onSaveRecord,
}) => {
  // 主队与客队直接设置 (取消机械场次代号)
  const [homeTeam, setHomeTeam] = useState('英格兰');
  const [awayTeam, setAwayTeam] = useState('芬兰');
  const [league, setLeague] = useState('欧国联');
  const [matchTime, setMatchTime] = useState('2026-10-07 02:45');

  const [baseStake, setBaseStake] = useState<number>(10000.0);
  const [rows, setRows] = useState<SingleCoverRow[]>(INITIAL_ROWS);

  // Add Option Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState<'jc' | 'hg'>('jc');
  const [newMarketName, setNewMarketName] = useState('竞彩 平局');
  const [newPick, setNewPick] = useState('平');
  const [newOdds, setNewOdds] = useState('3.25');
  const [newRebate, setNewRebate] = useState(rebateConfig.jcRebateRate.toString());

  const [showOutcomeTable, setShowOutcomeTable] = useState(false);
  const [copiedJc, setCopiedJc] = useState(false);
  const [copiedHg, setCopiedHg] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 1. LIVE SETTLEMENT EVALUATION: Evaluates directly from currently edited stakes!
  const calcResult = evaluateSingleCoverCurrentStakes(rows, rebateConfig);

  // 2. RE-BALANCE / RE-CALCULATE OPTIMAL STAKES
  const handleRecalculate = () => {
    const updated = solveOptimalSingleCoverStakes(rows, baseStake);
    setRows(updated);
  };

  // Directly edit market name (单关投注项目自由修改)
  const handleMarketNameChange = (id: string, marketName: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, marketName } : r)));
  };

  // Directly edit pick text
  const handlePickChange = (id: string, pick: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, pick } : r)));
  };

  // Toggle source platform
  const handleToggleSource = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              source: r.source === 'jc' ? 'hg' : 'jc',
              rebateRate: r.source === 'jc' ? rebateConfig.hgRebateRate : rebateConfig.jcRebateRate,
            }
          : r
      )
    );
  };

  // Adjust odds
  const updateOdds = (id: string, delta: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextOdds = Math.max(1.01, Number((r.odds + delta).toFixed(2)));
          return { ...r, odds: nextOdds };
        }
        return r;
      })
    );
  };

  const handleOddsChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, odds: val } : r))
    );
  };

  // Adjust stake (manual input directly updates live settlement preview!)
  const handleStakeChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, stake: val } : r))
    );
  };

  // Adjust individual rebate %
  const handleRebateChange = (id: string, value: string) => {
    const val = parseFloat(value) || 0;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rebateRate: val } : r))
    );
  };

  // Delete Option
  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      alert('单关对冲至少需要保留 1 个投注选项！');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Add Option
  const handleAddRow = () => {
    const odds = parseFloat(newOdds) || 2.0;
    const targetPayout = (rows[0]?.stake || 10000) * (rows[0]?.odds || 2.0);
    const stake = Number((targetPayout / Math.max(0.01, odds)).toFixed(2));

    const newRow: SingleCoverRow = {
      id: `sc-${Date.now()}`,
      source: newSource,
      marketName: newMarketName,
      pick: newPick,
      odds,
      stake,
      rebateRate: parseFloat(newRebate) || (newSource === 'jc' ? rebateConfig.jcRebateRate : rebateConfig.hgRebateRate),
    };

    setRows((prev) => [...prev, newRow]);
    setShowAddModal(false);
  };

  // Batch sync default rebates
  const handleBatchSyncRebate = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        rebateRate: r.source === 'jc' ? rebateConfig.jcRebateRate : rebateConfig.hgRebateRate,
      }))
    );
  };

  // Copy JC
  const handleCopyJc = () => {
    const jcItems = rows
      .filter((r) => r.source === 'jc')
      .map((r) => ({
        label: `${r.marketName} [${r.pick}]`,
        odds: r.odds,
        stake: r.stake,
        rebateRate: r.rebateRate,
      }));
    const totalJc = jcItems.reduce((s, i) => s + i.stake, 0);
    const slip = formatJcTicketSlip(
      `单关对冲`,
      `[${league}] 主队: ${homeTeam} VS 客队: ${awayTeam} (${matchTime})`,
      jcItems,
      totalJc
    );
    navigator.clipboard.writeText(slip);
    setCopiedJc(true);
    setTimeout(() => setCopiedJc(false), 2000);
  };

  // Copy Crown
  const handleCopyHg = () => {
    const hgItems = rows
      .filter((r) => r.source === 'hg')
      .map((r) => ({
        label: `${r.marketName} [${r.pick}]`,
        odds: r.odds,
        stake: r.stake,
        rebateRate: r.rebateRate,
      }));
    const totalHg = hgItems.reduce((s, i) => s + i.stake, 0);
    const slip = formatHgBetSlip(
      `单关对冲`,
      `[${league}] 主队: ${homeTeam} VS 客队: ${awayTeam} (${matchTime})`,
      hgItems,
      totalHg
    );
    navigator.clipboard.writeText(slip);
    setCopiedHg(true);
    setTimeout(() => setCopiedHg(false), 2000);
  };

  // Save Record
  const handleSaveToHistory = () => {
    const summary = rows
      .map((r) => `${r.marketName}(${r.pick})@${r.odds}(¥${r.stake},返${r.rebateRate}%)`)
      .join(' | ');

    onSaveRecord({
      mode: 'single',
      title: `单关对冲 · ${homeTeam} VS ${awayTeam}`,
      matchInfo: `[${homeTeam} VS ${awayTeam}] · ${rows.length}项对冲组合`,
      jcStake: calcResult.totalJcStake,
      hgStake: calcResult.totalHgStake,
      totalStake: calcResult.totalStake,
      expectedProfit: calcResult.expectedProfit,
      roiRate: calcResult.roiRate,
      rebateAmount: calcResult.rebateTotal,
      status: 'pending',
      details: {
        itemsSummary: summary,
        jsonRaw: JSON.stringify({ rows, baseStake, rebateConfig }),
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-32">
      {/* Top Match Card (主队与客队直接修改，取消机械场次代号) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-purple-100/80 relative overflow-hidden space-y-3">
        {/* Header with Title Badge & Profit Rate */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
              单关对冲
            </span>
            <span className="text-slate-400 text-[10px] sm:text-[11px]">点击下方修改主客队</span>
          </div>

          <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700 text-white rounded-xl px-2.5 py-1 text-center shadow-xs shrink-0 flex items-center gap-1.5">
            <span className="text-[10px] text-pink-100">利润率</span>
            <span className="text-sm sm:text-base font-extrabold font-mono">
              {calcResult.roiRate > 0 ? `+${calcResult.roiRate.toFixed(2)}%` : `${calcResult.roiRate.toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* Editable Match Info (Full width, responsive) */}
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              placeholder="联赛名称"
            />
            <input
              type="text"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500"
              placeholder="比赛时间"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-400 block mb-0.5">主队</span>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 text-center truncate"
                placeholder="主队"
              />
            </div>
            <span className="text-purple-700 font-black text-xs px-1 pt-3">VS</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-400 block mb-0.5">客队</span>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 text-center truncate"
                placeholder="客队"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">基准投注:</span>
            {[5000, 10000, 20000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setBaseStake(amt);
                  const updated = solveOptimalSingleCoverStakes(rows, amt);
                  setRows(updated);
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                  baseStake === amt
                    ? 'bg-purple-100 text-purple-800 font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ¥{amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchSyncRebate}
              className="text-[11px] text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              同步默认返点
            </button>
            <button
              onClick={onOpenRebateModal}
              className="flex items-center gap-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg transition-colors font-medium"
            >
              <SlidersHorizontal className="w-3 h-3" />
              全局返点
            </button>
          </div>
        </div>
      </div>

      {/* Options List Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
          对冲投注选项列表 ({rows.length}项 · 项目名称与方向均可自由编辑)
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          添加对冲选项
        </button>
      </div>

      {/* Options Rows (单关投注项目自由修改) */}
      <div className="space-y-3">
        {rows.map((row) => {
          const isJc = row.source === 'jc';
          return (
            <div
              key={row.id}
              className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-purple-50 space-y-2.5 transition-shadow hover:shadow-sm"
            >
              {/* Top Row: Platform (Left), Market Name (Center), Stake & Delete (Right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* Platform Badge (可点击切换竞彩/皇冠) */}
                  <button
                    type="button"
                    onClick={() => handleToggleSource(row.id)}
                    title="点击切换竞彩/皇冠"
                    className={`px-2 py-1 rounded-lg text-center text-white shrink-0 shadow-xs transition-transform active:scale-95 ${
                      isJc
                        ? 'bg-gradient-to-b from-orange-500 to-orange-600'
                        : 'bg-gradient-to-b from-purple-700 to-purple-800'
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">
                      {isJc ? '竞彩' : '皇冠'}
                    </span>
                  </button>

                  <input
                    type="text"
                    value={row.marketName}
                    onChange={(e) => handleMarketNameChange(row.id, e.target.value)}
                    className="w-full px-2 py-1 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white truncate"
                    placeholder="投注项目名称"
                    title="投注项目（可自由修改）"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Bet Stake Input */}
                  <div className="bg-slate-100/90 rounded-xl px-2 py-0.5 border border-slate-200/70 text-right">
                    <span className="text-[9px] text-slate-400 block leading-none">投注金额</span>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[10px] text-slate-500 font-mono">¥</span>
                      <input
                        type="number"
                        step="1"
                        value={row.stake}
                        onChange={(e) => handleStakeChange(row.id, e.target.value)}
                        className="w-18 text-right font-mono font-bold text-xs sm:text-sm text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Delete Option Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(row.id)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                    title="删除该选项"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Middle Row: Selection & Odds Stepper */}
              <div
                className={`rounded-xl p-1.5 flex items-center justify-between border gap-2 ${
                  isJc
                    ? 'bg-amber-50/50 border-amber-100/70'
                    : 'bg-purple-50/60 border-purple-100/80'
                }`}
              >
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="text-[10px] text-slate-500 shrink-0">投注方向:</span>
                  <input
                    type="text"
                    value={row.pick}
                    onChange={(e) => handlePickChange(row.id, e.target.value)}
                    className={`w-full px-2 py-0.5 rounded-md text-xs font-bold text-white text-center truncate ${
                      isJc ? 'bg-orange-500' : 'bg-purple-800'
                    }`}
                    placeholder="方向"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-white rounded-lg p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateOdds(row.id, -0.05)}
                    className="w-6 h-6 rounded-md bg-slate-50 text-slate-600 hover:text-purple-700 flex items-center justify-center shadow-xs border border-slate-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={row.odds}
                    onChange={(e) => handleOddsChange(row.id, e.target.value)}
                    className={`w-14 text-center font-mono font-extrabold text-sm bg-transparent focus:outline-none ${
                      isJc ? 'text-amber-800' : 'text-purple-900'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => updateOdds(row.id, 0.05)}
                    className="w-6 h-6 rounded-md bg-purple-700 text-white flex items-center justify-center shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Individual Rebate bar */}
              <div className="flex items-center justify-between text-xs px-1 pt-0.5 border-t border-slate-100 flex-wrap gap-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Percent className={`w-3 h-3 shrink-0 ${isJc ? 'text-orange-500' : 'text-purple-600'}`} />
                  <span className="text-[11px] font-medium">{row.marketName} 独立返点:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="25"
                    value={row.rebateRate ?? (isJc ? rebateConfig.jcRebateRate : rebateConfig.hgRebateRate)}
                    onChange={(e) => handleRebateChange(row.id, e.target.value)}
                    className={`w-12 text-center px-1 py-0.5 border rounded-md font-mono text-[11px] font-bold focus:outline-none ${
                      isJc
                        ? 'bg-orange-50 border-orange-200 text-orange-800'
                        : 'bg-purple-50 border-purple-200 text-purple-900'
                    }`}
                  />
                  <span className="text-[11px] text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  预计返 ¥{(((Number(row.stake) || 0) * (Number(row.rebateRate) || 0)) / 100).toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 结算预览 */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">结算预览</h3>
            <p className="text-xs text-slate-400">单场对冲实时多端盈亏核算</p>
          </div>
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-medium text-pink-100">预计保底利润</div>
            <div className="text-base font-extrabold font-mono">
              ¥{calcResult.expectedProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {calcResult.outcomeReturns.map((out) => (
            <div
              key={out.id}
              className={`rounded-2xl p-3 border ${
                out.source === 'jc'
                  ? 'bg-amber-50/40 border-amber-100/60'
                  : 'bg-purple-50/40 border-purple-100/60'
              }`}
            >
              <div className="text-xs text-slate-500 font-medium mb-1 truncate">
                若打出【{out.marketName}】
              </div>
              <div
                className={`text-lg font-extrabold font-mono ${
                  out.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {out.netProfit >= 0 ? `+¥${out.netProfit.toFixed(2)}` : `-¥${Math.abs(out.netProfit).toFixed(2)}`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                返还: ¥{out.grossReturn.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">总投注: </span>
            <span className="font-mono font-bold text-slate-800">¥{calcResult.totalStake.toFixed(2)}</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-slate-500">双边返点: </span>
            <span className="font-mono font-bold text-emerald-600">+¥{calcResult.rebateTotal.toFixed(2)}</span>
          </div>
          <div className="font-bold text-purple-800">
            利润率: {calcResult.roiRate.toFixed(2)}%
          </div>
        </div>

        {/* Outcome detailed breakdown table */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowOutcomeTable(!showOutcomeTable)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-purple-700 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              查看所有对冲项命中后实得净回报明细
            </span>
            {showOutcomeTable ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showOutcomeTable && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">命中项</th>
                    <th className="py-2 px-3">投注额 × 赔率</th>
                    <th className="py-2 px-3 text-right">总返还金额</th>
                    <th className="py-2 px-3 text-right">含返点净利润</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {calcResult.outcomeReturns.map((out) => (
                    <tr key={out.id} className="hover:bg-purple-50/30">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {out.marketName}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                        ¥{out.stake} × {out.odds.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 font-semibold">
                        ¥{out.grossReturn.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          out.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {out.netProfit >= 0 ? `+¥${out.netProfit.toFixed(2)}` : `-¥${Math.abs(out.netProfit).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-2 sm:px-3 py-2 sm:py-2.5 pb-safe bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-xl">
        <div className="max-w-xl mx-auto flex items-center gap-1.5 sm:gap-2">
          {/* 重新计算 */}
          <button
            type="button"
            onClick={handleRecalculate}
            className="flex-1 h-11 sm:h-12 px-2 rounded-2xl bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-md shadow-purple-900/20 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">对冲配平</span>
          </button>

          {/* 竞彩复制 */}
          <button
            type="button"
            onClick={handleCopyJc}
            className="flex-1 h-11 sm:h-12 px-2 rounded-2xl bg-white hover:bg-purple-50 text-purple-900 border-2 border-purple-800/80 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
          >
            {copiedJc ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-600 truncate">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-800 shrink-0" />
                <span className="truncate">竞彩单</span>
              </>
            )}
          </button>

          {/* 皇冠复制 */}
          <button
            type="button"
            onClick={handleCopyHg}
            className="h-11 sm:h-12 px-2.5 sm:px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
          >
            {copiedHg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>皇冠单</span>
          </button>

          {/* 存单 */}
          <button
            type="button"
            onClick={handleSaveToHistory}
            className={`h-11 sm:h-12 px-2.5 sm:px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1 transition-all shrink-0 ${
              savedSuccess
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>已存</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>存单</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: Add Single Cover Option */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900">
              添加单关对冲选项
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  平台来源
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSource('jc');
                      setNewRebate(rebateConfig.jcRebateRate.toString());
                    }}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      newSource === 'jc'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    竞彩 (JC)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSource('hg');
                      setNewRebate(rebateConfig.hgRebateRate.toString());
                    }}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      newSource === 'hg'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    皇冠 (HG)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  value={newMarketName}
                  onChange={(e) => setNewMarketName(e.target.value)}
                  placeholder="如: 竞彩 主胜 / 皇冠 平局"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  初始赔率
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newOdds}
                  onChange={(e) => setNewOdds(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  该项独立返点/返水 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newRebate}
                  onChange={(e) => setNewRebate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-purple-700 rounded-xl hover:bg-purple-800"
              >
                确认添加选项
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
