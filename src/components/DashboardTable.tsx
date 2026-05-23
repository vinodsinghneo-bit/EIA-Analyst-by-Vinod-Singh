/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SeriesInfo } from '../types';
import { getRegion, valNWeeks, avg4w, prev4wAvg, ly4wAvg, chg, fv } from '../utils';
import { Sparkles } from 'lucide-react';

interface DashboardTableProps {
  series: SeriesInfo[];
  data: Record<string, [string, number][]>;
  onOpenSingleInsight?: (series: SeriesInfo) => void;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({ series, data, onOpenSingleInsight }) => {
  const getRegionBadge = (reg: string) => {
    switch (reg) {
      case 'PADD1':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 whitespace-nowrap">
            PADD 1
          </span>
        );
      case 'PADD2':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
            PADD 2
          </span>
        );
      case 'PADD3':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            PADD 3
          </span>
        );
      case 'PADD4':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
            PADD 4
          </span>
        );
      case 'PADD5':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-50 border-slate-500/20 whitespace-nowrap">
            PADD 5
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
            US Total
          </span>
        );
    }
  };

  const getRegionLabel = (reg: string) => {
    switch (reg) {
      case 'PADD1': return 'PADD 1 — East Coast';
      case 'PADD2': return 'PADD 2 — Midwest';
      case 'PADD3': return 'PADD 3 — Gulf Coast';
      case 'PADD4': return 'PADD 4 — Rocky Mountain';
      case 'PADD5': return 'PADD 5 — West Coast';
      default: return '🇺🇸 United States Total';
    }
  };

  const renderChanges = (changes: ReturnType<typeof chg>) => {
    if (!changes) return <span className="text-slate-500 dark:text-slate-600">—</span>;
    const sign = changes.abs >= 0 ? '+' : '';
    const icon = changes.dir === 'up' ? '▲' : changes.dir === 'dn' ? '▼' : '—';
    const colorClass =
      changes.dir === 'up'
        ? 'text-emerald-500 dark:text-emerald-400'
        : changes.dir === 'dn'
        ? 'text-rose-500 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400';

    return (
      <span className={`inline-flex items-center gap-0.5 font-mono text-[10.5px] font-semibold ${colorClass}`}>
        <span className="text-[8px]">{icon}</span>
        {sign}
        {fv(changes.abs)}
        {changes.pct !== null && ` (${changes.pct >= 0 ? '+' : ''}${changes.pct.toFixed(1)}%)`}
      </span>
    );
  };

  const groupedByRegion: Record<string, SeriesInfo[]> = {};
  series.forEach((s) => {
    const r = getRegion(s.desc);
    if (!groupedByRegion[r]) groupedByRegion[r] = [];
    groupedByRegion[r].push(s);
  });

  const regionsOrder = ['US', 'PADD1', 'PADD2', 'PADD3', 'PADD4', 'PADD5'];

  return (
    <div className="w-full">
      {/* Table view for Medium + Desktop screens */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 backdrop-blur-md shadow-xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 min-w-[200px]">Description</th>
              <th className="px-3 py-3">SourceKey</th>
              <th className="px-3 py-3 text-center">Region</th>
              <th className="px-3 py-3">Latest Date</th>
              <th className="px-3 py-3 text-right">Latest</th>
              <th className="px-3 py-3 text-right">Last Wk</th>
              <th className="px-4 py-3 text-right">WoW Δ</th>
              <th className="px-3 py-3 text-right">Last Mo</th>
              <th className="px-4 py-3 text-right">MoM Δ</th>
              <th className="px-3 py-3 text-right">Last Yr</th>
              <th className="px-4 py-3 text-right">YoY Δ</th>
              <th className="px-3 py-3 text-right">4Wk Avg</th>
              <th className="px-3 py-3 text-right">Prev 4Wk</th>
              <th className="px-4 py-3 text-right">4Wk Δ</th>
              {onOpenSingleInsight && <th className="px-3 py-3 text-center">AI</th>}
            </tr>
          </thead>
          <tbody>
            {regionsOrder.map((r) => {
              const items = groupedByRegion[r];
              if (!items || !items.length) return null;

              return (
                <React.Fragment key={r}>
                  {/* PADD Group Header Row */}
                  <tr className="bg-slate-100/60 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
                    <td colSpan={onOpenSingleInsight ? 15 : 14} className="px-4 py-2 font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        {getRegionBadge(r)}
                        <span>{getRegionLabel(r)}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-normal">({items.length} series)</span>
                      </div>
                    </td>
                  </tr>

                  {items.map((s) => {
                    const rows = data[s.sk];
                    if (!rows || !rows.length) return null;

                    const ld = rows[rows.length - 1][0];
                    const lv = rows[rows.length - 1][1];

                    const wk = valNWeeks(s.sk, ld, 1, data);
                    const mo = valNWeeks(s.sk, ld, 4, data);
                    const yr = valNWeeks(s.sk, ld, 52, data);

                    const a4 = avg4w(s.sk, ld, data);
                    const pa = prev4wAvg(s.sk, ld, data);

                    const wowChg = chg(lv, wk);
                    const momChg = chg(lv, mo);
                    const yoyChg = chg(lv, yr);
                    const avgChg = chg(a4, pa);

                    return (
                      <tr
                        key={s.sk}
                        className="border-b border-slate-100 dark:border-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-150"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-200 max-w-[240px] truncate" title={s.desc}>
                          {s.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-sky-500 dark:text-sky-400">{s.sk}</td>
                        <td className="px-3 py-2.5 text-center">{getRegionBadge(r)}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ld}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{fv(lv)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{fv(wk)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{renderChanges(wowChg)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{fv(mo)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{renderChanges(momChg)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{fv(yr)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{renderChanges(yoyChg)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-600 dark:text-slate-300">{fv(a4)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{fv(pa)}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">{renderChanges(avgChg)}</td>
                        {onOpenSingleInsight && (
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => onOpenSingleInsight(s)}
                              className="p-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 transition duration-150 cursor-pointer"
                              title="Generate AI Analyst Insights"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Accordion / Card-List view for Mobile Devices */}
      <div className="block md:hidden space-y-3">
        {regionsOrder.map((r) => {
          const items = groupedByRegion[r];
          if (!items || !items.length) return null;

          return (
            <div key={r} className="space-y-2">
              <div className="flex items-center gap-2 px-1 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {getRegionBadge(r)}
                <span>{getRegionLabel(r)}</span>
              </div>

              {items.map((s) => {
                const rows = data[s.sk];
                if (!rows || !rows.length) return null;

                const ld = rows[rows.length - 1][0];
                const lv = rows[rows.length - 1][1];

                const wk = valNWeeks(s.sk, ld, 1, data);
                const mo = valNWeeks(s.sk, ld, 4, data);
                const yr = valNWeeks(s.sk, ld, 52, data);

                const a4 = avg4w(s.sk, ld, data);
                const pa = prev4wAvg(s.sk, ld, data);

                const wowChg = chg(lv, wk);
                const momChg = chg(lv, mo);
                const yoyChg = chg(lv, yr);
                const avgChg = chg(a4, pa);

                return (
                  <div
                    key={s.sk}
                    className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 space-y-2.5 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5 justify-between">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug" title={s.desc}>
                            {s.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                          </h4>
                          {onOpenSingleInsight && (
                            <button
                              onClick={() => onOpenSingleInsight(s)}
                              className="p-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 transition shrink-0 cursor-pointer"
                              title="Generate AI Analyst Insights"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-[9px] text-sky-500 dark:text-sky-400">{s.sk}</span>
                          <span className="text-slate-400 dark:text-slate-600 text-[9px]">•</span>
                          <span className="text-[10px] text-slate-400">{ld}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-50">{fv(lv)}</span>
                        <div className="text-[9px] text-slate-400 uppercase">Latest Value</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">vs Last Wk</span>
                        <div className="text-right">{renderChanges(wowChg)}</div>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">vs Last Mo</span>
                        <div className="text-right">{renderChanges(momChg)}</div>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">vs Last Yr</span>
                        <div className="text-right">{renderChanges(yoyChg)}</div>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">4Wk vs Prev</span>
                        <div className="text-right">{renderChanges(avgChg)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
