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
  ArrowRightLeft,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface ImportsExportsWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const ImportsExportsWindow: React.FC<ImportsExportsWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Try to find US crude imports and exports
  const importsData = useMemo(() => {
    const match = series.find((s) => {
      const d = s.desc.toLowerCase();
      return (
        d.includes('imports') &&
        d.includes('crude oil') &&
        d.includes('u.s.') &&
        !d.includes('padd')
      );
    });

    if (match && dataMap[match.sk]?.length) {
      const rows = dataMap[match.sk];
      const val = rows[rows.length - 1][1];
      const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;

      return {
        sk: match.sk,
        desc: match.desc,
        val,
        prev,
      };
    }
    return null;
  }, [series, dataMap]);

  const exportsData = useMemo(() => {
    const match = series.find((s) => {
      const d = s.desc.toLowerCase();
      return (
        d.includes('exports') &&
        d.includes('crude oil') &&
        d.includes('u.s.') &&
        !d.includes('padd')
      );
    });

    if (match && dataMap[match.sk]?.length) {
      const rows = dataMap[match.sk];
      const val = rows[rows.length - 1][1];
      const prev = rows.length > 1 ? rows[rows.length - 2][1] : null;

      return {
        sk: match.sk,
        desc: match.desc,
        val,
        prev,
      };
    }
    return null;
  }, [series, dataMap]);

  // Compute Net Imports (Imports - Exports)
  const tradeBalance = useMemo(() => {
    if (!importsData || !exportsData) return null;
    const value = importsData.val - exportsData.val;
    const prevValue = importsData.prev !== null && exportsData.prev !== null ? importsData.prev - exportsData.prev : null;
    const delta = prevValue !== null ? value - prevValue : null;

    return {
      value,
      prevValue,
      delta,
    };
  }, [importsData, exportsData]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 transition-colors duration-200 ${
        isDarkMode 
          ? 'border-rose-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-rose-400 bg-rose-400/10 uppercase tracking-widest border border-rose-400/20">
            INTERNATIONAL TRADE
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            EIA Imports, Exports &amp; Net Balance Analyzer
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-rose-500/10 border-rose-500/20' 
            : 'bg-rose-50 border-rose-100'
        }`}>
          <ArrowRightLeft className="w-6 h-6 text-rose-400" />
        </div>
      </div>

      {/* Trade Balance custom scorecard block */}
      {tradeBalance && (
        <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-1.5 col-span-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span>Insights</span>
            </h3>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              U.S. Crude Oil Net Trade Balance
            </h4>
            <div className="text-xs text-slate-400 leading-relaxed whitespace-normal break-words text-wrap">
              When this balance is positive, the US is a <b>Net Importer</b> of crude oil. When negative, the US is a <b>Net Exporter</b>.
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">
              {tradeBalance.value >= 0 ? '🇺🇸 NET IMPORTS' : '🌎 NET EXPORTS'}
            </span>
            <div className="text-3xl font-black font-mono mt-1 text-slate-900 dark:text-white">
              {Math.abs(tradeBalance.value * 1000).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">b/d</span>
            </div>
            {tradeBalance.delta !== null && (
              <span
                className={`text-[10px] font-mono mt-2 px-1.5 py-0.5 rounded border ${
                  tradeBalance.delta >= 0
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}
              >
                {tradeBalance.delta >= 0 ? 'Increased' : 'Decreased'} by{' '}
                {Math.abs(tradeBalance.delta * 1000).toLocaleString()} b/d vs last week
              </span>
            )}
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
              <span className="text-slate-400">Gross Crude Imports:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {importsData ? (importsData.val * 1000).toLocaleString() : '—'} b/d
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
              <span className="text-slate-400">Gross Crude Exports:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {exportsData ? (exportsData.val * 1000).toLocaleString() : '—'} b/d
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trade Flows graphs */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-pink-400 uppercase border-b border-pink-400/20 pb-1 flex items-center gap-2">
          <span>Active Trade Flows timelines</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`trade-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Series Key: <span className="text-pink-400 font-bold font-mono">{item.sk}</span>
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
