/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { SeriesInfo } from '../../types';
import { MetricChart } from '../MetricChart';
import { fv, chg, valAt, valNWeeks } from '../../utils';
import {
  TrendingUp,
  TrendingDown,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  MapPin,
  Flame,
  Zap,
  ShieldAlert
} from 'lucide-react';

interface StocksWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const StocksWindow: React.FC<StocksWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Extract key stocks metrics by analyzing series descriptions
  const keyStocksMetrics = useMemo(() => {
    const results: {
      label: string;
      sk: string;
      desc: string;
      val: number | null;
      prevVal: number | null;
      changeAbs: number | null;
      changePct: number | null;
      changeAbs4W: number | null;
      changePct4W: number | null;
      changeAbs52W: number | null;
      changePct52W: number | null;
      icon: any;
      color: string;
      unit: string;
    }[] = [];

    const findSk = (keywords: string[], exclude?: string[]) => {
      const match = series.find((s) => {
        const d = s.desc.toLowerCase();
        const matchesAll = keywords.every((kw) => d.includes(kw));
        const matchesNone = exclude ? !exclude.some((ex) => d.includes(ex)) : true;
        return matchesAll && matchesNone;
      });
      return match ? match.sk : null;
    };

    // Define major stocks categories
    const configs = [
      {
        label: 'Commercial Crude Stocks',
        keywords: ['stocks of crude oil', 'u.s.'],
        exclude: ['strategic petroleum', 'padd', 'east coast', 'gulf coast', 'midwest', 'rocky', 'west coast'],
        icon: Database,
        color: 'sky',
        unit: 'Thousand Barrels',
      },
      {
        label: 'SPR (Strategic Reserve)',
        keywords: ['stocks of crude oil', 'strategic petroleum'],
        exclude: ['padd', 'east coast'],
        icon: ShieldAlert,
        color: 'amber',
        unit: 'Thousand Barrels',
      },
      {
        label: 'Total Motor Gasoline',
        keywords: ['total motor gasoline', 'stocks', 'u.s.'],
        exclude: ['padd', 'east coast'],
        icon: Flame,
        color: 'emerald',
        unit: 'Thousand Barrels',
      },
      {
        label: 'Distillate Fuel Oil',
        keywords: ['distillate fuel oil', 'stocks', 'u.s.'],
        exclude: ['padd', 'east coast', 'midwest', 'gulf', 'rocky', 'west'],
        icon: Zap,
        color: 'indigo',
        unit: 'Thousand Barrels',
      },
      {
        label: 'Kerosene-Type Jet Fuel',
        keywords: ['kerosene-type jet fuel', 'stocks', 'u.s.'],
        exclude: ['padd', 'east coast'],
        icon: Layers,
        color: 'rose',
        unit: 'Thousand Barrels',
      },
    ];

    configs.forEach((cfg) => {
      const matchedSk = findSk(cfg.keywords, cfg.exclude);
      if (matchedSk && dataMap[matchedSk]?.length) {
        const history = dataMap[matchedSk];
        const lastRow = history[history.length - 1];
        const prevRow = history.length > 1 ? history[history.length - 2] : null;

        const val = lastRow ? lastRow[1] : null;
        const prevVal = prevRow ? prevRow[1] : null;
        let changeAbs = null;
        let changePct = null;

        if (val !== null && prevVal !== null) {
          changeAbs = val - prevVal;
          changePct = prevVal !== 0 ? (changeAbs / Math.abs(prevVal)) * 100 : null;
        }

        // Monthly (4 Weeks ago) change calculation
        const val4W = lastRow ? valNWeeks(matchedSk, lastRow[0], 4, dataMap) : null;
        let changeAbs4W = null;
        let changePct4W = null;
        if (val !== null && val4W !== null) {
          changeAbs4W = val - val4W;
          changePct4W = val4W !== 0 ? (changeAbs4W / Math.abs(val4W)) * 100 : null;
        }

        // Yearly (52 Weeks ago) change calculation
        const val52W = lastRow ? valNWeeks(matchedSk, lastRow[0], 52, dataMap) : null;
        let changeAbs52W = null;
        let changePct52W = null;
        if (val !== null && val52W !== null) {
          changeAbs52W = val - val52W;
          changePct52W = val52W !== 0 ? (changeAbs52W / Math.abs(val52W)) * 100 : null;
        }

        const seriesObj = series.find((s) => s.sk === matchedSk)!;

        results.push({
          label: cfg.label,
          sk: matchedSk,
          desc: seriesObj.desc,
          val,
          prevVal,
          changeAbs,
          changePct,
          changeAbs4W,
          changePct4W,
          changeAbs52W,
          changePct52W,
          icon: cfg.icon,
          color: cfg.color,
          unit: cfg.unit,
        });
      }
    });

    return results;
  }, [series, dataMap]);

  // Breakdown by PADD region for commercial crude stocks
  const paddCrudeBreakdown = useMemo(() => {
    const rawPadds = [
      { tag: 'PADD 1', kw: ['padd 1', 'stocks of crude oil'], title: 'East Coast' },
      { tag: 'PADD 2', kw: ['padd 2', 'stocks of crude oil'], title: 'Midwest' },
      { tag: 'PADD 3', kw: ['padd 3', 'stocks of crude oil'], title: 'Gulf Coast' },
      { tag: 'PADD 4', kw: ['padd 4', 'stocks of crude oil'], title: 'Rocky Mtn' },
      { tag: 'PADD 5', kw: ['padd 5', 'stocks of crude oil'], title: 'West Coast' },
    ];

    return rawPadds
      .map((p) => {
        const match = series.find((s) => {
          const d = s.desc.toLowerCase();
          return p.kw.every((k) => d.includes(k)) && !d.includes('strategic');
        });

        if (match && dataMap[match.sk]?.length) {
          const rows = dataMap[match.sk];
          const val = rows[rows.length - 1][1];
          const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;
          const delta = prev !== null ? val - prev : null;

          return {
            tag: p.tag,
            regionName: p.title,
            sk: match.sk,
            desc: match.desc,
            val,
            prev,
            delta,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [series, dataMap]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Module Title Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-sky-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-sky-400 bg-sky-400/10 uppercase tracking-widest border border-sky-400/20">
            STOCKS WINDOW
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            EIA Weekly Inventory &amp; Stocks Analyzer
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-sky-500/10 border-sky-500/20' 
            : 'bg-sky-50 border-sky-100'
        }`}>
          <Database className="w-6 h-6 text-sky-400" />
        </div>
      </div>

      {/* Key Stats Cards Bento Section */}
      {keyStocksMetrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {keyStocksMetrics.map((item) => {
            const IconComponent = item.icon;
            const isDrawdown = item.changeAbs !== null && item.changeAbs < 0;
            const isFlat = item.changeAbs === null || Math.abs(item.changeAbs) < 1e-5;

            return (
              <div
                key={item.sk}
                className={`p-4 rounded-2xl border backdrop-blur shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-500/30 transition-all duration-200 ${
                  isDarkMode
                    ? 'border-slate-800/80 bg-slate-950/25'
                    : 'border-slate-200 bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate tracking-wide uppercase">
                    {item.label}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/15`}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="text-xl font-black tracking-tight font-mono text-slate-900 dark:text-white">
                    {fv(item.val)} <span className="text-[10px] font-normal text-slate-400 font-sans">Mbbl</span>
                  </div>
                </div>

                {/* Granular Baseline Change Signals Panel */}
                <div className={`space-y-1.5 pt-2 border-t text-[10px] font-mono transition-colors duration-200 ${
                  isDarkMode ? 'border-slate-800/60' : 'border-slate-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">WoW (1 Wk):</span>
                    {isFlat ? (
                      <span className="text-slate-400 font-semibold">Static</span>
                    ) : isDrawdown ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                        {fv(item.changeAbs)} ({item.changePct?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                        +{fv(item.changeAbs)} (+{item.changePct?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">MoM (4 Wks):</span>
                    {item.changeAbs4W === null || Math.abs(item.changeAbs4W) < 1e-5 ? (
                      <span className="text-slate-400 font-medium">—</span>
                    ) : item.changeAbs4W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                        {fv(item.changeAbs4W)} ({item.changePct4W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                        +{fv(item.changeAbs4W)} (+{item.changePct4W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">YoY (52 Wks):</span>
                    {item.changeAbs52W === null || Math.abs(item.changeAbs52W) < 1e-5 ? (
                      <span className="text-slate-400 font-medium">—</span>
                    ) : item.changeAbs52W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                        {fv(item.changeAbs52W)} ({item.changePct52W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                        +{fv(item.changeAbs52W)} (+{item.changePct52W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[9px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2 line-clamp-1 leading-normal" title={item.sk}>
                  {item.sk}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-center text-slate-400 text-xs font-mono">
          🔍 Standard commercial crude and stock keys could not be fully resolved in the loaded dataset profile.
        </div>
      )}

      {/* Region Segment / Regional PADD breakdown */}
      {paddCrudeBreakdown.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl border border-slate-250 dark:border-slate-800/80 bg-white dark:bg-slate-950/20 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
              Commercial Crude Inventory breakdown by PADD District
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {paddCrudeBreakdown.map((r, i) => {
              if (!r) return null;
              const isMinus = r.delta !== null && r.delta < 0;
              return (
                <div
                  key={r.sk + i}
                  className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/40 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">
                        {r.regionName}
                      </span>
                      <h4 className="text-[11px] font-bold text-slate-430 mt-1">{r.tag}</h4>
                    </div>
                    {r.delta !== null && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          isMinus
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {r.delta >= 0 ? '+' : ''}
                        {fv(r.delta)}
                      </span>
                    )}
                  </div>
                  <div className="text-base font-black tracking-tight font-mono text-slate-800 dark:text-white mt-2">
                    {fv(r.val)} <span className="text-[10px] font-medium text-slate-500 font-sans">Mbbl</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Graphic Analysis viewport inside native stocks window */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-sky-450 uppercase border-b border-sky-400/20 pb-1 flex items-center gap-2">
          <span>Insights</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`stocks-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                    Source Key: <span className="text-sky-400 font-bold">{item.sk}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto">
                  <div className="h-auto">
                    <div className="text-[8.5px] font-bold font-mono text-slate-400 uppercase tracking-widest text-center mb-1">
                      Wk Changes
                    </div>
                    <MetricChart
                      type="chg"
                      sk={item.sk}
                      desc={item.desc}
                      cat={item.cat}
                      data={rows}
                      isDarkMode={isDarkMode}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      customStartYear={customStartYear}
                      customEndYear={customEndYear}
                      chartYears={chartYears}
                    />
                  </div>
                  <div className="h-auto">
                    <div className="text-[8.5px] font-bold font-mono text-slate-400 uppercase tracking-widest text-center mb-1">
                      Historical Range
                    </div>
                    <MetricChart
                      type="range"
                      sk={item.sk}
                      desc={item.desc}
                      cat={item.cat}
                      data={rows}
                      isDarkMode={isDarkMode}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      customStartYear={customStartYear}
                      customEndYear={customEndYear}
                      chartYears={chartYears}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
