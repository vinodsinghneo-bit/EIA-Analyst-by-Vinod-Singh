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
  LineChart,
  ShoppingBag,
  Compass,
  ArrowRight
} from 'lucide-react';

interface ProductSuppliedWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const ProductSuppliedWindow: React.FC<ProductSuppliedWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Find key surrogate demand elements (US Total Product Supplied, Motor Gasoline supplied, Distillate supplied)
  const demandStreams = useMemo(() => {
    const streams = [
      { label: 'Total Petroleum Products Supplied', kw: ['total petroleum products', 'supplied'], color: 'sky' },
      { label: 'Finished Motor Gasoline Supplied', kw: ['motor gasoline', 'supplied'], color: 'emerald' },
      { label: 'Distillate Fuel Oil Supplied', kw: ['distillate', 'supplied'], color: 'indigo' },
    ];

    return streams
      .map((st) => {
        const match = series.find((s) => {
          const d = s.desc.toLowerCase();
          return st.kw.every((k) => d.includes(k)) && !d.includes('padd') && d.includes('u.s.');
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
            label: st.label,
            sk: match.sk,
            desc: match.desc,
            val,
            prev,
            delta,
            val4W,
            delta4W,
            val52W,
            delta52W,
            color: st.color,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [series, dataMap]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-sky-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-sky-450 bg-sky-500/10 uppercase tracking-widest border border-sky-400/20">
            INTERNAL DEMAND PROFILE
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            Implied Petroleum Product Supplied (Demand) Dashboard
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-sky-500/10 border-sky-500/20' 
            : 'bg-sky-50 border-sky-100'
        }`}>
          <ShoppingBag className="w-6 h-6 text-sky-400" />
        </div>
      </div>

      {/* Demand Streams indicators row layout */}
      {demandStreams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demandStreams.map((item) => {
            const isMinus = item.delta !== null && item.delta < 0;
            const pct1W = (item.prev && item.prev !== 0 && item.delta !== null) ? (item.delta / Math.abs(item.prev)) * 100 : null;
            const pct4W = (item.val4W && item.val4W !== 0 && item.delta4W !== null) ? (item.delta4W / Math.abs(item.val4W)) * 100 : null;
            const pct52W = (item.val52W && item.val52W !== 0 && item.delta52W !== null) ? (item.delta52W / Math.abs(item.val52W)) * 100 : null;

            return (
              <div
                key={item.sk}
                className="p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm space-y-4 hover:border-sky-500/25 transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide font-mono w-full break-words whitespace-normal text-wrap">
                    {item.label}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-1 w-full break-words whitespace-normal text-wrap">{item.sk}</div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {item.val ? (item.val * 1000).toLocaleString() : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans font-bold">b/d average</span>
                </div>

                {/* Granular Baseline Change Signals Panel */}
                <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/40 text-[10.5px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">WoW (1 Wk):</span>
                    {item.delta === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : item.delta < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(item.delta * 1000).toLocaleString()} b/d ({pct1W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(item.delta * 1000).toLocaleString()} b/d (+{pct1W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">MoM (4 Wks):</span>
                    {item.delta4W === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : item.delta4W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(item.delta4W * 1000).toLocaleString()} b/d ({pct4W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(item.delta4W * 1000).toLocaleString()} b/d (+{pct4W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">YoY (52 Wks):</span>
                    {item.delta52W === null ? (
                      <span className="text-slate-400 font-semibold">—</span>
                    ) : item.delta52W < 0 ? (
                      <span className="text-rose-600 dark:text-rose-450 font-bold">
                        ▼ {(item.delta52W * 1000).toLocaleString()} b/d ({pct52W?.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ▲ +{(item.delta52W * 1000).toLocaleString()} b/d (+{pct52W?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-center text-slate-400 text-xs font-mono">
          🔍 Demand indicators/consumption fields could not be fully mapped in this report.
        </div>
      )}

      {/* Product Supplied visual charts */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#38bdf8] uppercase border-b border-sky-400/20 pb-1 flex items-center gap-2">
          <span>Surrogate consumption trends</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`supplied-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Series: <span className="text-[#38bdf8] font-bold">{item.sk}</span>
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
