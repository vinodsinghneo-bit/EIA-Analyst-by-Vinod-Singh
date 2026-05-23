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
  Hammer,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Loader
} from 'lucide-react';

interface ProductionWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const ProductionWindow: React.FC<ProductionWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Find US Field Production of Crude Oil
  const crudeProduction = useMemo(() => {
    const match = series.find((s) => {
      const d = s.desc.toLowerCase();
      return (
        d.includes('field production') &&
        d.includes('crude oil') &&
        d.includes('u.s.') &&
        !d.includes('padd')
      );
    });

    if (match && dataMap[match.sk]?.length) {
      const rows = dataMap[match.sk];
      const val = rows[rows.length - 1][1];
      const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;
      const delta = prev !== null ? val - prev : null;

      return {
        sk: match.sk,
        desc: match.desc,
        val,
        prev,
        delta,
      };
    }
    return null;
  }, [series, dataMap]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-amber-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-amber-400 bg-amber-400/10 uppercase tracking-widest border border-amber-400/20">
            RAW EXTRACTION
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            Domestic Field Production Monitor
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-amber-500/10 border-amber-500/20' 
            : 'bg-amber-50 border-amber-100'
        }`}>
          <Hammer className="w-6 h-6 text-amber-400" />
        </div>
      </div>

      {/* Production Rate Highlights Widget */}
      {crudeProduction ? (
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono flex items-center gap-1">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Insights</span>
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              U.S. Field Production of Crude Oil
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed max-w-lg whitespace-normal break-words text-wrap">
              Represents the total weekly speed of raw petroleum output pumped out of conventional and shale fracking wells.
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 bg-slate-900/10 dark:bg-slate-950/60 p-1.5 rounded border border-transparent dark:border-slate-900 whitespace-normal break-words">
              {crudeProduction.sk}
            </div>
          </div>

          <div className="flex flex-col items-end justify-center text-right">
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight">
              {crudeProduction.val ? (crudeProduction.val * 1000).toLocaleString() : '—'}
            </div>
            <span className="text-xs text-slate-500 font-mono mt-1">barrels per day (b/d)</span>

            {crudeProduction.delta !== null && (
              <span
                className={`text-xs font-mono font-bold px-2 py-1 rounded-full border mt-3 inline-flex items-center gap-1 ${
                  crudeProduction.delta >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-500 border-rose-500/20'
                }`}
              >
                {crudeProduction.delta >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                )}
                {crudeProduction.delta >= 0 ? '+' : ''}
                {(crudeProduction.delta * 1000).toLocaleString()} b/d vs last week
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-center text-slate-400 text-xs font-mono">
          🔍 Domestic crude extraction production source key was not matching the current sheet.
        </div>
      )}

      {/* Production charts list */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#f59e0b] uppercase border-b border-[#f59e0b]/20 pb-1 flex items-center gap-2">
          <span>Production extraction charts</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`prod-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Series: <span className="text-amber-400 font-bold">{item.sk}</span>
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
