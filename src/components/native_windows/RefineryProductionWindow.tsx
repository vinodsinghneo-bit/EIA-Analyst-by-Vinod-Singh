/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { SeriesInfo } from '../../types';
import { MetricChart } from '../MetricChart';
import { fv } from '../../utils';
import {
  TrendingUp,
  Award,
  Flame,
  Zap,
  Layers,
  Cylinder
} from 'lucide-react';

interface RefineryProductionWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const RefineryProductionWindow: React.FC<RefineryProductionWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Extract key petrochemical output yields
  const yieldsList = useMemo(() => {
    const productsToFind = [
      { label: 'Finished Motor Gasoline', kw: ['motor gasoline', 'production'], icon: Flame, color: 'emerald' },
      { label: 'Distillate Fuel Oil', kw: ['distillate fuel oil', 'production'], icon: Zap, color: 'indigo' },
      { label: 'Kerosene-Type Jet Fuel', kw: ['jet fuel', 'production'], icon: Layers, color: 'rose' },
    ];

    return productsToFind
      .map((p) => {
        const match = series.find((s) => {
          const d = s.desc.toLowerCase();
          return p.kw.every((k) => d.includes(k)) && !d.includes('padd') && d.includes('u.s.');
        });

        if (match && dataMap[match.sk]?.length) {
          const rows = dataMap[match.sk];
          const val = rows[rows.length - 1][1];
          const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;
          const delta = prev !== null ? val - prev : null;

          return {
            label: p.label,
            sk: match.sk,
            desc: match.desc,
            val,
            prev,
            delta,
            icon: p.icon,
            color: p.color,
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
          ? 'border-indigo-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-indigo-400 bg-indigo-400/10 uppercase tracking-widest border border-indigo-400/20">
            WORK PRODUCT YIELDS
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            Refinery Production Yield Board
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-indigo-500/10 border-indigo-500/20' 
            : 'bg-indigo-50 border-indigo-100'
        }`}>
          <Cylinder className="w-6 h-6 text-indigo-400" />
        </div>
      </div>

      {/* Yield rates checklist layout */}
      {yieldsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {yieldsList.map((item) => {
            const IconComponent = item.icon;
            const isMinus = item.delta !== null && item.delta < 0;

            return (
              <div
                key={item.sk}
                className="p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm space-y-4 hover:border-indigo-500/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">
                    {item.label}
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {item.val ? (item.val * 1000).toLocaleString() : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">barrels per day (b/d) average scale</div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[120px]" title={item.sk}>
                    {item.sk}
                  </span>
                  {item.delta !== null && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isMinus
                          ? 'bg-rose-500/10 text-rose-501 border border-rose-500/15'
                          : 'bg-emerald-500/10 text-emerald-501 border border-emerald-500/15'
                      }`}
                    >
                      {item.delta >= 0 ? '+' : ''}
                      {(item.delta * 1000).toLocaleString()} b/d
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-center text-slate-400 text-xs font-mono">
          🔍 Standard refinery production products (Gasoline, Distillate, Jet Fuel) can not be matching keys in this file.
        </div>
      )}

      {/* Dynamic charts stack for Refinery Production */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#a78bfa] uppercase border-b border-[#a78bfa]/20 pb-1 flex items-center gap-2">
          <span>Active Product Output Charts</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`ref-prod-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Series: <span className="text-violet-400 font-bold">{item.sk}</span>
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
