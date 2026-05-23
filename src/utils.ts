/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { MetricChanges, SeriesInfo } from './types';

export function dateOffset(base: string, days: number): string {
  if (!base) return '';
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseDate(raw: any): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    if (raw instanceof Date) {
      return new Date(raw.getTime() - (raw.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 10);
    }
    if (typeof raw === 'string') {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 10);
      }
    }
    if (typeof raw === 'number') {
      const dt = XLSX.SSF.parse_date_code(raw);
      if (dt) {
        return `${dt.y}-${String(dt.m).padStart(2, '0')}-${String(dt.d).padStart(2, '0')}`;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getRegion(desc: string): 'US' | 'PADD1' | 'PADD2' | 'PADD3' | 'PADD4' | 'PADD5' {
  const d = desc.toUpperCase();
  if (d.includes('PADD 1') || d.includes('EAST COAST')) return 'PADD1';
  if (d.includes('PADD 2') || d.includes('MIDWEST')) return 'PADD2';
  if (d.includes('PADD 3') || d.includes('GULF COAST')) return 'PADD3';
  if (d.includes('PADD 4') || d.includes('ROCKY')) return 'PADD4';
  if (d.includes('PADD 5') || d.includes('WEST COAST')) return 'PADD5';
  return 'US';
}

export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + 1) / 7);
}

export function stripEmojis(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, "").trim();
}

export function valAt(sk: string, targetDate: string, data: Record<string, [string, number][]>): number | null {
  const rows = data[sk];
  if (!rows || !rows.length) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][0] <= targetDate) return rows[i][1];
  }
  return null;
}

export function valNWeeks(
  sk: string,
  refDate: string,
  n: number,
  data: Record<string, [string, number][]>
): number | null {
  return valAt(sk, dateOffset(refDate, -7 * n), data);
}

export function avg4w(
  sk: string,
  endDate: string,
  data: Record<string, [string, number][]>
): number | null {
  const rows = data[sk];
  if (!rows || !rows.length) return null;
  const start = dateOffset(endDate, -27);
  const vals = rows.filter((r) => r[0] <= endDate && r[0] >= start).map((r) => r[1]);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function prev4wAvg(
  sk: string,
  refDate: string,
  data: Record<string, [string, number][]>
): number | null {
  return avg4w(sk, dateOffset(refDate, -7), data);
}

export function ly4wAvg(
  sk: string,
  refDate: string,
  data: Record<string, [string, number][]>
): number | null {
  return avg4w(sk, dateOffset(refDate, -364), data);
}

export function chg(cur: number | null, prev: number | null): MetricChanges | null {
  if (cur === null || prev === null) return null;
  const abs = cur - prev;
  return {
    abs,
    pct: prev !== 0 ? (abs / Math.abs(prev)) * 100 : null,
    dir: abs > 1e-9 ? 'up' : abs < -1e-9 ? 'dn' : 'fl',
  };
}

export function fv(v: number | null, dp?: number): string {
  if (v === null || v === undefined) return '—';
  if (dp === undefined) {
    const abs = Math.abs(v);
    dp = abs > 1000 ? 0 : abs > 100 ? 1 : 2;
  }
  const absVal = Math.abs(v);
  if (absVal >= 1e6) {
    return (v / 1e6).toFixed(1) + 'M';
  }
  return v.toLocaleString('en-US', {
    maximumFractionDigits: dp,
    minimumFractionDigits: dp,
  });
}

// Convert a column structure to grouped structure for pivot selections
export function getProductFromDesc(desc: string): string {
  const m = desc.match(/ of\s+([A-Za-z][A-Za-z\s,]+?)(?:\s*\(|\s*,|\s*-|$)/);
  return m ? m[1].trim().slice(0, 40) : 'Other Products';
}

export function getUnitsForSeries(sk: string, desc: string, cat: string): string {
  const d = desc.toLowerCase();
  if (cat === 'Prices' || d.includes('price') || d.includes('dollars') || d.includes('$/')) {
    if (d.includes('gallon') || sk.includes('DPG')) return 'Dollars per Gallon';
    return 'Dollars per Barrel';
  }
  if (d.includes('utilization') || d.includes('percent')) {
    return 'Percent';
  }
  if (cat === 'Stocks' || d.includes('stocks')) {
    return 'Thousand Barrels';
  }
  if (
    cat === 'Production' ||
    cat === 'Refinery Production' ||
    cat === 'Product Supplied' ||
    cat === 'Imports' ||
    cat === 'Exports' ||
    d.includes('production') ||
    d.includes('supplied') ||
    d.includes('imports') ||
    d.includes('exports') ||
    d.includes('input')
  ) {
    return 'Thousand Barrels per Day';
  }
  return 'Thousand Barrels'; // default fallback
}

export function mergeSeriesLists(listA: SeriesInfo[], listB: SeriesInfo[]): SeriesInfo[] {
  const seen = new Set<string>();
  const merged: SeriesInfo[] = [];
  
  if (Array.isArray(listA)) {
    listA.forEach((s) => {
      if (s && s.sk && !seen.has(s.sk)) {
        seen.add(s.sk);
        merged.push(s);
      }
    });
  }
  
  if (Array.isArray(listB)) {
    listB.forEach((s) => {
      if (s && s.sk && !seen.has(s.sk)) {
        seen.add(s.sk);
        merged.push(s);
      }
    });
  }
  
  return merged;
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`localStorage.setItem failed for key "${key}":`, err);
    
    // Check if it is a QuotaExceededError
    const isQuotaError = 
      err.name === 'QuotaExceededError' || 
      err.code === 22 || 
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.message?.toLowerCase().includes('quota') ||
      err.message?.toLowerCase().includes('exceeded');

    if (isQuotaError) {
      if (key === 'eia_cached_datamap') {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            const trimmed: Record<string, [string, number][]> = {};
            // Attempt to compress by keeping only the latest 105 weeks of weekly data
            Object.keys(parsed).forEach((sk) => {
              const rows = parsed[sk];
              if (Array.isArray(rows)) {
                trimmed[sk] = rows.slice(-105);
              } else {
                trimmed[sk] = rows;
              }
            });
            localStorage.setItem(key, JSON.stringify(trimmed));
            console.log('Successfully trimmed and cached eia_cached_datamap to last 105 weeks.');
            return;
          }
        } catch (trimErr) {
          console.error('Failed to trim eia_cached_datamap on quota exceed:', trimErr);
        }
        
        // If trimming still fails, let's keep only 53 weeks (approximately 1 year of weekly history)
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            const trimmed: Record<string, [string, number][]> = {};
            Object.keys(parsed).forEach((sk) => {
              const rows = parsed[sk];
              if (Array.isArray(rows)) {
                trimmed[sk] = rows.slice(-53);
              } else {
                trimmed[sk] = rows;
              }
            });
            localStorage.setItem(key, JSON.stringify(trimmed));
            console.log('Successfully trimmed and cached eia_cached_datamap to last 53 weeks (extreme reduction).');
            return;
          }
        } catch (trimErr2) {
          console.error('Failed extreme trim of eia_cached_datamap:', trimErr2);
        }
      }
      
      // For any other keys or if trim attempts failed, try to clear out the heavy datamap to make space
      try {
        localStorage.removeItem('eia_cached_datamap');
        localStorage.setItem(key, value);
        console.log(`Cleared heavy datamap and successfully cached key "${key}".`);
      } catch (retryErr) {
        console.error(`Persistent Storage Quota Exceeded for key "${key}" even after pruning. Continuing without caching.`);
      }
    }
  }
}

