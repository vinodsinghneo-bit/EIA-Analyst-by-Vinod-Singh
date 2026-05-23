/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { SeriesInfo } from '../../types';
import { MetricChart } from '../MetricChart';
import { fv, valNWeeks } from '../../utils';
import {
  TrendingUp,
  Percent,
  Sliders,
  Play,
  Activity,
  Award
} from 'lucide-react';

interface RefineryWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const RefineryWindow: React.FC<RefineryWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Find refinery utilization (%)
  const utilizationMetric = useMemo(() => {
    const match = series.find((s) => {
      const d = s.desc.toLowerCase();
      return (
        d.includes('percent operable') ||
        d.includes('refinery utilization') ||
        d.includes('operating rate')
      );
    });

    if (match && dataMap[match.sk]?.length) {
      const rows = dataMap[match.sk];
      const val = rows[rows.length - 1][1];
      const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;
      const delta = prev !== null ? val - prev : null;

      const val4W = valNWeeks(match.sk, rows[rows.length - 1][0], 4, dataMap);
      const delta4W = val !== null && val4W !== null ? val - val4W : null;

      const val52W = valNWeeks(match.sk, rows[rows.length - 1][0], 52, dataMap);
      const delta52W = val !== null && val52W !== null ? val - val52W : null;

      return {
        sk: match.sk,
        desc: match.desc,
        val,
        prev,
        delta,
        val4W,
        delta4W,
        val52W,
        delta52W,
      };
    }
    return null;
  }, [series, dataMap]);

  // Gross / Net Inputs
  const inputStreams = useMemo(() => {
    const streamKeys = [
      { label: 'U.S. Crude Oil Net Inputs', kw: ['net inputs', 'u.s.'], color: 'sky' },
      { label: 'U.S. Crude Oil Gross Inputs', kw: ['gross inputs', 'u.s.'], color: 'indigo' },
    ];

    return streamKeys
      .map((k) => {
        const match = series.find((s) => {
          const d = s.desc.toLowerCase();
          return k.kw.every((word) => d.includes(word)) && !d.includes('padd');
        });

        if (match && dataMap[match.sk]?.length) {
          const rows = dataMap[match.sk];
          const val = rows[rows.length - 1][1];
          const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;
          const delta = prev !== null ? val - prev : null;

          const val4W = valNWeeks(match.sk, rows[rows.length - 1][0], 4, dataMap);
          const delta4W = val !== null && val4W !== null ? val - val4W : null;

          const val52W = valNWeeks(match.sk, rows[rows.length - 1][0], 52, dataMap);
          const delta52W = val !== null && val52W !== null ? val - val52W : null;

          return {
            label: k.label,
            sk: match.sk,
            desc: match.desc,
            val,
            prev,
            delta,
            val4W,
            delta4W,
            val52W,
            delta52W,
            color: k.color,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [series, dataMap]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner design */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-emerald-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-emerald-400 bg-emerald-400/10 uppercase tracking-widest border border-emerald-400/20">
            REFINERY OPERATIONS WINDOW
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            Refinery Activity &amp; Runs Tracker
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-emerald-500/10 border-emerald-500/20' 
            : 'bg-emerald-50 border-emerald-100'
        }`}>
          <Activity className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Utilization Rate Premium Gauge Layout */}
      {utilizationMetric && (
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Percent className="w-4 h-4" />
              <span>Insights</span>
            </span>
            <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">
              Refinery Utilization Capacity
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed whitespace-normal break-words text-wrap">
              Indicates the percentage of active domestic distillation tower configurations processing raw crude input feeds.
            </div>
            <div className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-900 whitespace-normal break-words">
              {utilizationMetric.sk}
            </div>
          </div>

          {/* Utilization Percentage Progress Meter */}
          <div className="flex flex-col space-y-3 py-4 w-full justify-center">
            <div className="text-center">
              <span className="text-5xl font-black font-mono text-emerald-400 tracking-tight">
                {utilizationMetric.val?.toFixed(1)}%
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-[9.5px] font-mono border-t border-slate-200/40 dark:border-slate-800/40 pt-2.5 max-w-sm mx-auto w-full">
              <div className="text-center space-y-0.5">
                <div className="text-slate-500 uppercase text-[8px] tracking-wider">WoW 1W</div>
                {utilizationMetric.delta !== null ? (
                  <span className={`font-bold ${utilizationMetric.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {utilizationMetric.delta >= 0 ? '▲ +' : '▼ '}{Math.abs(utilizationMetric.delta).toFixed(1)}%
                  </span>
                ) : <span className="text-slate-500">—</span>}
              </div>

              <div className="text-center space-y-0.5 border-x border-slate-200/40 dark:border-slate-800/40 px-1">
                <div className="text-slate-500 uppercase text-[8px] tracking-wider">MoM 4W</div>
                {utilizationMetric.delta4W !== null ? (
                  <span className={`font-bold ${utilizationMetric.delta4W >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {utilizationMetric.delta4W >= 0 ? '▲ +' : '▼ '}{Math.abs(utilizationMetric.delta4W).toFixed(1)}%
                  </span>
                ) : <span className="text-slate-500">—</span>}
              </div>

              <div className="text-center space-y-0.5">
                <div className="text-slate-500 uppercase text-[8px] tracking-wider">YoY 52W</div>
                {utilizationMetric.delta52W !== null ? (
                  <span className={`font-bold ${utilizationMetric.delta52W >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {utilizationMetric.delta52W >= 0 ? '▲ +' : '▼ '}{Math.abs(utilizationMetric.delta52W).toFixed(1)}%
                  </span>
                ) : <span className="text-slate-500">—</span>}
              </div>
            </div>
          </div>

          {/* Progress bar and legend guide bounds */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                <span>0% Shut down</span>
                <span>Active Operating: {utilizationMetric.val}%</span>
                <span>100% Max Run</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-950 h-3.5 rounded-full border border-slate-250 dark:border-slate-900 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-505 via-teal-400 to-sky-400 h-full rounded-full duration-500 transition-all shadow-inner"
                  style={{ width: `${Math.min(utilizationMetric.val || 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-400 leading-normal bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-150 dark:border-slate-900 font-mono">
              💡 Operating levels above 90% typically signal full utilization speed across primary complex refineries.
            </div>
          </div>
        </div>
      )}

      {/* Streaming input feeds parameters bento */}
      {inputStreams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inputStreams.map((s) => {
            const isMinus = s.delta !== null && s.delta < 0;
            const pct1W = (s.prev && s.prev !== 0 && s.delta !== null) ? (s.delta / Math.abs(s.prev)) * 100 : null;
            const pct4W = (s.val4W && s.val4W !== 0 && s.delta4W !== null) ? (s.delta4W / Math.abs(s.val4W)) * 100 : null;
            const pct52W = (s.val52W && s.val52W !== 0 && s.delta52W !== null) ? (s.delta52W / Math.abs(s.val52W)) * 100 : null;

            return (
              <div
                key={s.sk}
                className="p-5 rounded-3xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-950/20 flex flex-col justify-between hover:border-emerald-500/20 transition-all space-y-4"
              >
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider font-mono w-full break-words whitespace-normal text-wrap">
                      {s.label}
                    </h4>
                    <div className="text-[9px] font-mono text-slate-500 mt-1 w-full break-words whitespace-normal text-wrap">{s.sk}</div>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    {s.val ? (s.val * 1000).toLocaleString() : '—'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">barrels per day (b/d)</span>
                </div>

                {/* Granular Baseline Change Signals Panel */}
                <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/40 text-[10.5px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">WoW (1 Wk):</span>
                    {s.delta === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : s.delta < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(s.delta * 1000).toLocaleString()} b/d ({pct1W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(s.delta * 1000).toLocaleString()} b/d (+{pct1W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">MoM (4 Wks):</span>
                    {s.delta4W === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : s.delta4W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(s.delta4W * 1000).toLocaleString()} b/d ({pct4W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(s.delta4W * 1000).toLocaleString()} b/d (+{pct4W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">YoY (52 Wks):</span>
                    {s.delta52W === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : s.delta52W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(s.delta52W * 1000).toLocaleString()} b/d ({pct52W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(s.delta52W * 1000).toLocaleString()} b/d (+{pct52W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualization blocks */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase border-b border-emerald-400/20 pb-1 flex items-center gap-2">
          <span>Detailed Refinery Timeline Visualizers</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`refinery-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Source ID: <span className="text-emerald-400 font-bold font-mono">{item.sk}</span>
                  </div>
                </div>
                <div className="h-auto">
                  <MetricChart
                    type="trend"
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
