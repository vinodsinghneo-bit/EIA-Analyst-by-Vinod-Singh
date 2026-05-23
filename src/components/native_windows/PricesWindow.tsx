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
  DollarSign,
  Briefcase,
  Layers3,
  Globe2,
  ChevronRight
} from 'lucide-react';

interface PricesWindowProps {
  series: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const PricesWindow: React.FC<PricesWindowProps> = ({
  series,
  dataMap,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  // Extract primary fuel market prices
  const primaryPrices = useMemo(() => {
    const pricesList = [
      { label: 'WTI Crude Spot Price', kw: ['wti', 'spot'], isGallon: false },
      { label: 'Brent Crude Spot Price', kw: ['brent', 'spot'], isGallon: false },
      { label: 'U.S. Gasoline Retail Price', kw: ['gasoline', 'retail'], isGallon: true },
      { label: 'U.S. Diesel Retail Price', kw: ['diesel', 'retail'], isGallon: true },
    ];

    return pricesList
      .map((p) => {
        const match = series.find((s) => {
          const d = s.desc.toLowerCase();
          return p.kw.every((k) => d.includes(k));
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
            isGallon: p.isGallon,
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
          ? 'border-yellow-500/10 bg-gradient-to-tr from-slate-950/90 to-slate-900/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono text-yellow-450 bg-yellow-400/10 uppercase tracking-widest border border-yellow-400/20">
            PETROLEUM FUTURES MARKET
          </div>
          <h2 className={`text-xl font-bold tracking-tight transition-colors duration-200 ${
            isDarkMode ? 'text-slate-150' : 'text-slate-900'
          }`}>
            EIA Spot &amp; Retail Prices Ticker
          </h2>
        </div>
        <div className={`hidden sm:block p-3.5 rounded-2xl border transition-colors duration-200 ${
          isDarkMode 
            ? 'bg-yellow-500/10 border-yellow-500/20' 
            : 'bg-yellow-50 border-yellow-105'
        }`}>
          <DollarSign className="w-6 h-6 text-yellow-450" />
        </div>
      </div>

      {/* Spot Price custom tickers row layout */}
      {primaryPrices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {primaryPrices.map((item) => {
            const isMinus = item.delta !== null && item.delta < 0;
            return (
              <div
                key={item.sk}
                className="p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 bg-white dark:bg-slate-950/25 shadow-sm space-y-3 hover:border-yellow-500/25 transition-all"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-350 uppercase tracking-wide font-mono w-full break-words whitespace-normal text-wrap">
                    {item.label}
                  </h4>
                  <div className="text-[9.5px] font-mono text-slate-500 mt-1 w-full break-words whitespace-normal text-wrap">{item.sk}</div>
                </div>

                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                  <span>${item.val?.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">
                    /{item.isGallon ? 'gal' : 'bbl'}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/70 pt-2 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-mono">Chg:</span>
                  {item.delta !== null && (
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isMinus
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.delta >= 0 ? '+' : ''}
                      {item.delta.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-center text-slate-400 text-xs font-mono">
          💡 Price benchmark indexes could not be fully loaded from this worksheet structure. Try configuring active price tags.
        </div>
      )}

      {/* Visual charts stack */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#fbbf24] uppercase border-b border-[#fbbf24]/20 pb-1 flex items-center gap-2">
          <span>Benchmarked Historical Price Curves</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {series.slice(0, 4).map((item) => {
            const rows = dataMap[item.sk];
            if (!rows || !rows.length) return null;
            return (
              <div
                key={`price-chg-${item.sk}`}
                className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-950/25 shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-normal break-words text-wrap leading-tight pr-1" title={item.desc}>
                    {item.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                  </h4>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Series ID: <span className="text-[#fbbf24] font-bold font-mono">{item.sk}</span>
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
