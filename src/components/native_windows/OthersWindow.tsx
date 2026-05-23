/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { SeriesInfo } from '../../types';
import { MetricChart } from '../MetricChart';
import { fv } from '../../utils';
import {
  Compass,
  LayoutGrid,
  BarChart4,
  TrendingUp
} from 'lucide-react';

interface OthersWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const OthersWindow: React.FC<OthersWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  const [visibleChg, setVisibleChg] = useState(6);
  const [visibleTrend, setVisibleTrend] = useState(6);

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-slate-205 dark:border-slate-800 rounded-3xl bg-slate-105/10 dark:bg-slate-900/15 text-slate-500 text-center space-y-3">
        <Compass className="w-8 h-8 text-sky-500/40 animate-spin" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Insights Series Active</h4>
        <div className="text-xs text-slate-400 font-mono">
          Activate other custom petroleum tags using the &quot;Configure Series&quot; button.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-slate-800 bg-slate-900/15 shadow-inner' 
          : 'border-slate-205 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 uppercase tracking-widest border border-slate-200 dark:border-slate-800">
            METRIC WORKBENCH
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-white' : 'text-slate-950'
          }`}>
            Insights &amp; Standard Metric Analysis
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <LayoutGrid className="w-6 h-6 text-slate-500" />
        </div>
      </div>

      {/* Week Changes block */}
      <div className="space-y-4">
        <div className="flex border-b border-light-mode/10 dark:border-slate-800 pb-1 items-baseline justify-between">
          <h4 className="text-[10px] font-mono font-bold tracking-widest text-sky-450 uppercase flex items-center gap-2">
            <BarChart4 className="w-4 h-4 text-sky-400" />
            <span>Weekly Progress Cards ({series.length} metrics found)</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.slice(0, visibleChg).map((s, idx) => {
            const rows = dataMap[s.sk];
            if (!rows || !rows.length) return null;
            const lv = rows[rows.length - 1][1];
            return (
              <div
                key={`others-chg-${s.sk}-${idx}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-150 whitespace-normal break-words leading-tight" title={s.desc}>
                    {s.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h5>
                  <div className="text-[9.5px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="text-sky-400 font-bold">{s.sk}</span>
                    <span>•</span>
                    <span>Value: {fv(lv)}</span>
                  </div>
                </div>
                <div className="h-auto">
                  <MetricChart
                    type="chg"
                    sk={s.sk}
                    desc={s.desc}
                    cat={s.cat}
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
        {series.length > visibleChg && (
          <button
            onClick={() => setVisibleChg((prev) => prev + 9)}
            className="w-full text-center p-3.5 border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-sky-400 rounded-xl text-xs font-bold cursor-pointer transition-all duration-150"
          >
            Show More Records (+{series.length - visibleChg} items)
          </button>
        )}
      </div>

      {/* Historical Trends block */}
      <div className="space-y-4">
        <div className="flex border-b border-light-mode/10 dark:border-slate-800 pb-1 items-baseline justify-between">
          <h4 className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Aggregate Historical Timelines</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.slice(0, visibleTrend).map((s, idx) => {
            const rows = dataMap[s.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`others-trend-${s.sk}-${idx}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-150 whitespace-normal break-words leading-tight" title={s.desc}>
                    {s.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h5>
                  <div className="text-[9.5px] font-mono text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                    <span className="text-emerald-400 font-bold">{s.sk}</span>
                    <span>•</span>
                    <span>Timeline view</span>
                  </div>
                </div>
                <div className="h-auto">
                  <MetricChart
                    type="trend"
                    sk={s.sk}
                    desc={s.desc}
                    cat={s.cat}
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
        {series.length > visibleTrend && (
          <button
            onClick={() => setVisibleTrend((prev) => prev + 9)}
            className="w-full text-center p-3.5 border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 text-[#4ade80] rounded-xl text-xs font-bold cursor-pointer transition"
          >
            Show More Trends (+{series.length - visibleTrend} items)
          </button>
        )}
      </div>
    </div>
  );
};
