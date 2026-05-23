/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  Download,
  Upload,
  Layers,
  Settings,
  Sun,
  Moon,
  Smartphone,
  Globe,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Mail,
  Printer,
  FileDown,
  Info,
  ChevronDown,
  ChevronUp,
  Compass,
  BarChart4,
  LayoutGrid,
  TrendingDown,
  Calendar,
  Layers3,
  MapPin,
  Eye,
  EyeOff,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';

import { SeriesInfo, TabKey } from './types';
import {
  parseDate,
  dateOffset,
  getRegion,
  getProductFromDesc,
  avg4w,
  prev4wAvg,
  ly4wAvg,
  valNWeeks,
  chg,
  fv,
  stripEmojis,
  mergeSeriesLists,
  safeSetItem
} from './utils';
import { DashboardTable } from './components/DashboardTable';
import { SeriesSelectorScreen } from './components/SeriesSelectorScreen';
import { MetricChart } from './components/MetricChart';
import { DEFAULT_SERIES } from './defaultSeries';

import { StocksWindow } from './components/native_windows/StocksWindow';
import { RefineryWindow } from './components/native_windows/RefineryWindow';
import { RefineryProductionWindow } from './components/native_windows/RefineryProductionWindow';
import { ProductionWindow } from './components/native_windows/ProductionWindow';
import { ProductSuppliedWindow } from './components/native_windows/ProductSuppliedWindow';
import { ImportsExportsWindow } from './components/native_windows/ImportsExportsWindow';
import { PricesWindow } from './components/native_windows/PricesWindow';
import { OthersWindow } from './components/native_windows/OthersWindow';
import { AIAnalystDesk } from './components/AIAnalystDesk';

const TABS: { key: TabKey; lbl: string }[] = [
  { key: 'stocks', lbl: 'Stocks' },
  { key: 'refinery', lbl: 'Ref activity' },
  { key: 'refinery_prod', lbl: 'Ref Production' },
  { key: 'production', lbl: 'Production' },
  { key: 'supplied', lbl: 'Prod Supplied' },
  { key: 'imports', lbl: 'Imports' },
  { key: 'exports', lbl: 'Exports' },
  { key: 'prices', lbl: 'Prices' },
  { key: 'others', lbl: 'Insights' }
];

const TAB_CATS: Record<TabKey, string[]> = {
  stocks: ['Stocks'],
  refinery: ['Refinery Activity'],
  refinery_prod: ['Refinery Production'],
  production: ['Production'],
  supplied: ['Product Supplied'],
  imports: ['Imports'],
  exports: ['Exports'],
  prices: ['Prices'],
  others: ['Insights']
};

interface Toast {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>(DEFAULT_SERIES);
  const [dataMap, setDataMap] = useState<Record<string, [string, number][]>>({});
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem('user_eia_api_key') || '';
  });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('stocks');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedSingleSeries, setSelectedSingleSeries] = useState<SeriesInfo | null>(null);

  // Filter Variables
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  
  // Custom Ranges
  const [customStartYear, setCustomStartYear] = useState('');
  const [customEndYear, setCustomEndYear] = useState('');
  const [chartYears, setChartYears] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // UI control
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [latestDate, setLatestDate] = useState('');
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'config'>('dashboard');
  const [activeTabSection, setActiveTabSection] = useState<'table' | 'cards'>('cards');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [showFilterShelf, setShowFilterShelf] = useState<boolean>(true);

  // View limits for chart grid loads (performance controls)
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({
    chg: 6,
    trend: 6,
    monthly: 6,
    range: 6
  });

  // Standalone and prompt installer trackers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Ref file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  // Toasts
  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Monitor standalone PWA install modes
  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      addToast("Petroleum Dashboard is installable on your device!", "info");
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      addToast("Thank you for installing EIA Petroleum Dashboard!", "success");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Retrieve saved dark mode preset
    const savedTheme = localStorage.getItem('eia_theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Load cached EIA series list and database maps for continuous PWA offline experience
  useEffect(() => {
    try {
      const cachedSeries = localStorage.getItem('eia_cached_series');
      const cachedData = localStorage.getItem('eia_cached_datamap');
      const cachedLatest = localStorage.getItem('eia_cached_latest');
      if (cachedSeries && cachedData) {
        const parsedSeries = JSON.parse(cachedSeries);
        const parsedData = JSON.parse(cachedData);
        const mergedSeriesList = mergeSeriesLists(parsedSeries, DEFAULT_SERIES);
        setSeriesList(mergedSeriesList);
        setDataMap(parsedData);
        if (cachedLatest) {
          setLatestDate(cachedLatest);
          setDateTo(cachedLatest);
          setDateFrom('2021-01-01');
        }

        const savedKeys = localStorage.getItem('eia_cached_keys');
        if (savedKeys) {
          setSelectedKeys(new Set(JSON.parse(savedKeys)));
        } else {
          setSelectedKeys(new Set(parsedSeries.map((s: any) => s.sk)));
        }

        const uniqueYears = new Set<string>();
        Object.values(parsedData).forEach((rows: any) => {
          rows.forEach((r: any) => uniqueYears.add(r[0].slice(0, 4)));
        });
        const yrsArr = Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
        setAvailableYears(yrsArr);
        if (yrsArr.length >= 5) {
          setCustomEndYear(yrsArr[0]);
          setCustomStartYear(yrsArr[4]);
        } else if (yrsArr.length > 0) {
          setCustomEndYear(yrsArr[0]);
          setCustomStartYear(yrsArr[yrsArr.length - 1]);
        }
      }
    } catch (e) {
      console.error("Failed to restore cached EIA data:", e);
    }
  }, []);

  const fetchLiveEiaData = async (keysToFetch: string[], targetSeriesList?: SeriesInfo[]) => {
    if (keysToFetch.length === 0) return;
    setLoading(true);
    setLoadingText(`Syncing live from U.S. EIA database (${keysToFetch.length} series requested)...`);
    
    try {
      const response = await fetch('/api/eia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eia-api-key': userApiKey,
        },
        body: JSON.stringify({
          series: keysToFetch,
          apiKey: userApiKey || undefined
        })
      });
      
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch EIA series datasets.');
      }
      
      const results = json.results as Record<string, [string, number][]>;
      const nextDataMap = { ...dataMap, ...results };
      setDataMap(nextDataMap);
      
      const nextSeriesList = targetSeriesList || [...seriesList];
      setSeriesList(nextSeriesList);
      
      const allDates = (Object.values(nextDataMap) as [string, number][][]).flatMap((r) => r.map((x) => x[0]));
      const latest = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : '';
      setLatestDate(latest);
      
      if (latest) {
        setDateTo(latest);
        setDateFrom('2021-01-01');
      }
      
      if (targetSeriesList) {
        setSelectedKeys(new Set(targetSeriesList.slice(0, 120).map((s) => s.sk)));
      }
      
      const uniqueYears = new Set<string>();
      (Object.values(nextDataMap) as [string, number][][]).forEach((rows) => {
        rows.forEach((r) => uniqueYears.add(r[0].slice(0, 4)));
      });
      const yrsArr = Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
      setAvailableYears(yrsArr);
      if (yrsArr.length >= 5) {
        setCustomEndYear(yrsArr[0]);
        setCustomStartYear(yrsArr[4]);
      } else if (yrsArr.length > 0) {
        setCustomEndYear(yrsArr[0]);
        setCustomStartYear(yrsArr[yrsArr.length - 1]);
      }
      
      safeSetItem('eia_cached_series', JSON.stringify(nextSeriesList));
      safeSetItem('eia_cached_datamap', JSON.stringify(nextDataMap));
      safeSetItem('eia_cached_latest', latest);
      safeSetItem('eia_cached_keys', JSON.stringify(Array.from(targetSeriesList ? new Set(targetSeriesList.map(s => s.sk)) : selectedKeys)));
      
      addToast(`Successfully connected and downloaded ${Object.keys(results).length} series live from EIA API!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`EIA API Fail: ${err?.message || 'Check your internet connection and API Key correctness.'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Set dark mode body class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      addToast("Add to Home Screen: Click Chrome menu (⋮) -> 'Add to Home Screen' or 'Install app'.", "info");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App install accepted!');
      setDeferredPrompt(null);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      safeSetItem('eia_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Main Parser Action
  const handleFileUpload = (file: File) => {
    setLoading(true);
    setLoadingText(`Reading "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        setLoadingText('Parsing Weekly Petroleum Workbook sheets...');
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });

        const parsedSeries: SeriesInfo[] = [];
        const parsedDataMap: Record<string, [string, number][]> = {};

        const sheetCats: Record<number, string> = {
          1: 'Production',
          2: 'Refinery Activity',
          3: 'Refinery Activity',
          4: 'Production',
          5: 'Production',
          6: 'Stocks',
          7: 'Imports',
          8: 'Exports',
          9: 'Imports',
          10: 'Product Supplied',
          11: 'Others'
        };

        for (let n = 1; n <= 11; n++) {
          const sn = `Data ${n}`;
          if (!workbook.SheetNames.includes(sn)) continue;
          const sheet = workbook.Sheets[sn];
          
          const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
          if (aoa.length < 4) continue;

          const baseCat = sheetCats[n] || 'Others';
          const skeys = (aoa[1] || []).slice(1).map((s) => String(s || '').trim());
          const descs = (aoa[2] || []).slice(1).map((s) => String(s || '').trim());
          const totalCols = Math.min(skeys.length, descs.length);

          for (let c = 0; c < totalCols; c++) {
            const sk = skeys[c];
            const desc = descs[c];
            if (!sk || sk === 'undefined' || !desc || desc === 'undefined') continue;
            if (parsedDataMap[sk]) continue;

            let cat = baseCat;
            const descUpper = desc.toUpperCase();
            
            // Check for Price indicators
            if (
              descUpper.includes('PRICE') || 
              descUpper.includes('DOLLARS PER') || 
              descUpper.includes('COST OF') || 
              descUpper.includes('RETAIL') ||
              descUpper.includes('$/GAL') || 
              descUpper.includes('$/BBL') ||
              sk.startsWith('EMM_') ||
              sk.startsWith('EMD_') ||
              (sk.startsWith('R') && sk.length <= 6)
            ) {
              cat = 'Prices';
            } else if (baseCat === 'Refinery Activity' && descUpper.includes('PRODUCTION')) {
              cat = 'Refinery Production';
            }
            if (
              baseCat === 'Refinery Activity' &&
              !descUpper.includes('UTILIZATION') &&
              !descUpper.includes('INPUT') &&
              cat !== 'Refinery Production' &&
              cat !== 'Prices'
            ) {
              cat = 'Others';
            }

            const rows: [string, number][] = [];
            for (let r = 3; r < aoa.length; r++) {
              const row = aoa[r];
              if (!row) continue;
              const dv = row[0];
              const vv = row[c + 1];
              if (dv === undefined || dv === null || dv === '') continue;
              if (vv === '' || vv === null || vv === undefined) continue;

              const v = parseFloat(vv);
              if (isNaN(v)) continue;

              const d = parseDate(dv);
              if (d) {
                rows.push([d, Math.round(v * 1000) / 1000]);
              }
            }

            if (rows.length) {
              rows.sort((a, b) => a[0].localeCompare(b[0]));
              parsedSeries.push({ sk, desc, cat });
              parsedDataMap[sk] = rows;
            }
          }
        }

        // Parse prices columns from Price matching sheets if available
        workbook.SheetNames.forEach((sn) => {
          if (!/price|spot|wps/i.test(sn)) return;
          const sheet = workbook.Sheets[sn];
          const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
          if (aoa.length < 4) return;

          const skeys = (aoa[1] || []).slice(1).map((s) => String(s || '').trim());
          const descs = (aoa[2] || []).slice(1).map((s) => String(s || '').trim());
          const totalCols = Math.min(skeys.length, descs.length);

          for (let c = 0; c < totalCols; c++) {
            const sk = skeys[c];
            const desc = descs[c];
            if (!sk || sk === 'undefined' || !desc || parsedDataMap[sk]) continue;

            const rows: [string, number][] = [];
            for (let r = 3; r < aoa.length; r++) {
              const row = aoa[r];
              if (!row) continue;
              const dv = row[0];
              const vv = row[c + 1];
              if (!dv || vv === '' || vv === null || vv === undefined) continue;

              const v = parseFloat(vv);
              if (isNaN(v)) continue;

              const d = parseDate(dv);
              if (d) {
                rows.push([d, Math.round(v * 1000) / 1000]);
              }
            }

            if (rows.length) {
              rows.sort((a, b) => a[0].localeCompare(b[0]));
              parsedSeries.push({ sk, desc, cat: 'Prices' });
              parsedDataMap[sk] = rows;
            }
          }
        });

        if (parsedSeries.length === 0) {
          throw new Error('No valid dataset found matching EIA Weekly format columns.');
        }

        const allDates = Object.values(parsedDataMap).flatMap((r) => r.map((x) => x[0]));
        const latest = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : '';

        const mergedSeriesList = mergeSeriesLists(parsedSeries, DEFAULT_SERIES);
        setSeriesList(mergedSeriesList);
        setDataMap(parsedDataMap);
        setLatestDate(latest);

        // Pre-select first 120 US only items for initial dashboard view
        const usOnly = mergedSeriesList.filter((s) => {
          const d = s.desc.toUpperCase();
          return (
            (d.includes('U.S.') || d.includes('UNITED STATES')) &&
            !d.includes('EAST COAST') &&
            !d.includes('MIDWEST') &&
            !d.includes('GULF COAST') &&
            !d.includes('ROCKY') &&
            !d.includes('WEST COAST') &&
            !d.includes('PADD')
          );
        });

        const initialSel = new Set(usOnly.slice(0, 120).map((s) => s.sk));
        setSelectedKeys(initialSel);

        // Cache parameters to localStorage for future sessions
        safeSetItem('eia_cached_series', JSON.stringify(mergedSeriesList));
        safeSetItem('eia_cached_datamap', JSON.stringify(parsedDataMap));
        safeSetItem('eia_cached_latest', latest);
        safeSetItem('eia_cached_keys', JSON.stringify(Array.from(initialSel)));

        // Date Defaults
        setDateTo(latest);
        setDateFrom('2021-01-01');

        // Available comparison years
        const uniqueYears = new Set<string>();
        Object.values(parsedDataMap).forEach((rows) => {
          rows.forEach((r) => uniqueYears.add(r[0].slice(0, 4)));
        });
        const yrsArr = Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
        setAvailableYears(yrsArr);

        if (yrsArr.length >= 5) {
          setCustomEndYear(yrsArr[0]);
          setCustomStartYear(yrsArr[4]);
        } else if (yrsArr.length > 0) {
          setCustomEndYear(yrsArr[0]);
          setCustomStartYear(yrsArr[yrsArr.length - 1]);
        }

        setLoading(false);
        addToast(`Successfully loaded and indexed ${parsedSeries.length} series through wk ${latest}!`, 'success');
      } catch (err: any) {
        setLoading(false);
        console.error(err);
        addToast(`Format Error: ${err?.message || 'Unsupported energy file. Please load official weekly psw09 file.'}`, 'error');
      }
    };
    reader.onerror = () => {
      setLoading(false);
      addToast('File reading failed.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  // Extract list of products for PWA modal filtering
  const productsList = useMemo(() => {
    const prods = new Set<string>();
    seriesList.forEach((s) => {
      const p = getProductFromDesc(s.desc);
      if (p && p !== 'Other Products') {
        prods.add(p);
      }
    });
    return Array.from(prods).sort();
  }, [seriesList]);

  // Main Filtered active listings in active tab
  const activeTabSeriesList = useMemo(() => {
    const activeCats = TAB_CATS[activeTab];
    return seriesList.filter((s) => {
      if (!selectedKeys.has(s.sk)) return false;
      if (!activeCats.includes(s.cat)) return false;

      // Header UI Ribbons Custom Filter Presets
      if (selectedCats.length > 0 && !selectedCats.includes(s.cat)) return false;
      if (selectedRegions.length > 0 && !selectedRegions.includes(getRegion(s.desc))) return false;
      if (selectedProducts.length > 0) {
        const sProd = getProductFromDesc(s.desc).toLowerCase();
        const matchesProduct = selectedProducts.some((p) => sProd.includes(p.toLowerCase()));
        if (!matchesProduct) return false;
      }

      return true;
    });
  }, [seriesList, selectedKeys, activeTab, selectedRegions, selectedProducts, selectedCats]);

  const handleConfigModalApply = (nextKeys: Set<string>) => {
    setSelectedKeys(nextKeys);
    safeSetItem('eia_cached_keys', JSON.stringify(Array.from(nextKeys)));
    addToast(`Selected database updated to ${nextKeys.size} item filters.`, 'success');
  };

  // Export Spreadsheet logic
  const handleExportExcel = () => {
    if (seriesList.length === 0) return;
    setLoading(true);
    setLoadingText('Compiling compiled EIA reporting workbook...');
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        const headers = [
          'Description', 'SourceKey', 'Region', 'Category', 'LatestDate', 'LatestValue',
          'PrevWeek', 'WoW_AbsChange', 'WoW_PctChange', 'PrevMonth', 'MoM_Abs', 'MoM_Pct',
          'PrevYear', 'YoY_Abs', 'YoY_Pct', 'Avg4Wk', 'PrevAvg4Wk', 'Chg4Wk_Abs'
        ];

        // Gather statistics rows for ALL selected tabs
        const groupedRowsByTab: Record<string, any[][]> = {};
        
        seriesList.forEach((s) => {
          if (!selectedKeys.has(s.sk)) return;
          const rows = dataMap[s.sk];
          if (!rows || !rows.length) return;

          const ld = rows[rows.length - 1][0];
          const lv = rows[rows.length - 1][1];

          const wk = valNWeeks(s.sk, ld, 1, dataMap);
          const mo = valNWeeks(s.sk, ld, 4, dataMap);
          const yr = valNWeeks(s.sk, ld, 52, dataMap);

          const a4 = avg4w(s.sk, ld, dataMap);
          const pa = prev4wAvg(s.sk, ld, dataMap);

          const wowD = chg(lv, wk);
          const momD = chg(lv, mo);
          const yoyD = chg(lv, yr);
          const avgD = chg(a4, pa);

          const arrayRow = [
            s.desc,
            s.sk,
            getRegion(s.desc),
            s.cat,
            ld,
            lv,
            wk || '',
            wowD?.abs ?? '',
            wowD?.pct ? `${wowD.pct.toFixed(1)}%` : '',
            mo || '',
            momD?.abs ?? '',
            momD?.pct ? `${momD.pct.toFixed(1)}%` : '',
            yr || '',
            yoyD?.abs ?? '',
            yoyD?.pct ? `${yoyD.pct.toFixed(1)}%` : '',
            a4 ?? '',
            pa ?? '',
            avgD?.abs ?? ''
          ];

          if (!groupedRowsByTab[s.cat]) groupedRowsByTab[s.cat] = [];
          groupedRowsByTab[s.cat].push(arrayRow);
        });

        Object.entries(groupedRowsByTab).forEach(([catName, sheetRows]) => {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);
          XLSX.utils.book_append_sheet(wb, ws, catName.slice(0, 30));
        });

        XLSX.writeFile(wb, `EIA_Petroleum_Reporting_${latestDate}.xlsx`);
        addToast('Excel Workbook exported!', 'success');
      } catch (err: any) {
        console.error(err);
        addToast('Spreadsheet export failed.', 'error');
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const handleExportCSV = () => {
    if (activeTabSeriesList.length === 0) return;
    try {
      let csvContent = "Description,SourceKey,Category,LatestDate,LatestValue\n";
      activeTabSeriesList.forEach((s) => {
        const rows = dataMap[s.sk];
        if (rows && rows.length) {
          const ld = rows[rows.length - 1][0];
          const lv = rows[rows.length - 1][1];
          csvContent += `"${s.desc.replace(/"/g, '""')}",${s.sk},${s.cat},${ld},${lv}\n`;
        }
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `EIA_${activeTab}_Data_${latestDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('CSV spreadsheet saved!', 'success');
    } catch (e) {
      addToast('CSV export failed.', 'error');
    }
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#08101d] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 pb-12 overflow-x-hidden`}>
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border pointer-events-auto shadow-xl transition-all duration-300 transform translate-x-0 ${
              t.type === 'success'
                ? 'bg-[#0f1c2e] border-emerald-500/35 text-emerald-400'
                : t.type === 'error'
                ? 'bg-[#0f1c2e] border-rose-500/35 text-rose-400'
                : 'bg-[#0f1c2e] border-sky-500/35 text-sky-400'
            }`}
          >
            <span className="text-sm mt-0.5">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ'}
            </span>
            <p className="text-[11.5px] leading-relaxed font-medium font-mono">{t.msg}</p>
          </div>
        ))}
      </div>

      {/* Loading Blockout Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-200 font-mono tracking-wide">{loadingText || 'Working, please wait...'}</p>
        </div>
      )}

      {/* Header bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4 border-b transition-all duration-250 ${
        isDarkMode 
          ? 'bg-slate-950/90 border-slate-900 text-slate-100' 
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className={`font-mono text-sm font-bold tracking-wider leading-none transition-colors duration-200 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              EIA Analyst by Vinod Singh
            </h1>
            <p className={`text-[9.5px] mt-1 flex items-center gap-1.5 font-medium truncate transition-colors duration-200 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {seriesList.length > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  <span>{seriesList.length} global series database through wk {latestDate}</span>
                </>
              ) : (
                'Energy Information Administration'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls Area */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Show Control Panel button when hidden */}
          {!showFilterShelf && (
            <button
              onClick={() => {
                setShowFilterShelf(true);
                addToast('Control panel restored.', 'info');
              }}
              className={`p-1 rounded-xl transition duration-205 cursor-pointer shadow-md select-none border flex items-center justify-center ${
                isDarkMode
                  ? 'bg-[#0f1c2e]/60 hover:bg-slate-800 border-slate-800 text-sky-400'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-sky-600 shadow-sm'
              }`}
              title="Show Control Panel"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/15 flex-shrink-0">
                <Settings className="w-4 h-4 text-slate-950 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </button>
          )}

          {/* Custom sliding accessible toggle switcher */}
          <button
            id="header-theme-toggle"
            onClick={toggleTheme}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition duration-150 shadow-sm cursor-pointer select-none font-mono text-[10px] font-bold tracking-wider ${
              isDarkMode 
                ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700' 
                : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-400'
            }`}
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          >
            <span className="flex items-center gap-1">
              {isDarkMode ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/10" />
                  <span className="hidden sm:inline">DARK</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="hidden sm:inline">LIGHT</span>
                </>
              )}
            </span>
            <span className={`w-7 h-4 rounded-full p-0.5 flex relative items-center transition border ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full absolute transition-all duration-305 ${
                isDarkMode ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-sky-500'
              }`} />
            </span>
          </button>

          {/* Floating PWA Install Banner */}
          {deferredPrompt && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-sky-500/10 cursor-pointer hidden sm:flex"
            >
              <Smartphone className="w-3.5 h-3.5 fill-slate-950" />
              <span>Install to Android</span>
            </button>
          )}

          {seriesList.length > 0 && (
            <>
              <button
                onClick={() => setCurrentScreen(currentScreen === 'dashboard' ? 'config' : 'dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-black cursor-pointer transition ${
                  currentScreen === 'config'
                    ? 'bg-sky-500 text-slate-950 border-sky-450 shadow-md shadow-sky-500/15'
                    : 'bg-slate-900 border-slate-800 text-sky-400 hover:border-sky-500/50'
                }`}
                title={currentScreen === 'dashboard' ? 'Open configuration screen' : 'Return to main dashboard'}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{currentScreen === 'dashboard' ? 'Configure Series' : 'Dashboard'}</span>
              </button>
              
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/50 rounded-xl text-xs font-bold cursor-pointer"
                title="Download consolidated Excel Reporting workbook"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Excel</span>
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition cursor-pointer"
                title="Print custom reporting layout"
              >
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main core layout grid container */}
      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-4">

        {/* Mobile Quick installer trigger link */}
        {deferredPrompt && (
          <div className="sm:hidden p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400 flex items-center justify-between gap-3 shadow-md">
            <div className="flex gap-2.5 items-center">
              <Smartphone className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-bold text-xs leading-none text-slate-100">Install Mobile App</h4>
                <p className="text-[10px] text-slate-400 mt-1 truncate">Fast home screen setup, run full standalone</p>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="px-3.5 py-1.5 bg-sky-500 text-slate-950 text-[11px] font-black rounded-lg whitespace-nowrap cursor-pointer"
            >
              Get App
            </button>
          </div>
        )}

        {/* Empty placeholder view / Dual Connection Method wizard */}
        {seriesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black text-sky-450 bg-sky-400/10 uppercase tracking-widest border border-sky-400/20">
                Weekly EIA Petroleum status PWA
              </span>
              <h2 className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                Choose Data Connection Method
              </h2>
              <p className={`text-sm max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Select your preferred way to populate the Energy Information Administration interactive dashboard. Initialize with raw spreadsheet files or connect the live web API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {/* Card 1: Local XLSX Upload */}
              <div className={`p-8 border rounded-3xl flex flex-col justify-between text-left space-y-6 shadow-xl ${
                isDarkMode 
                  ? 'border-slate-800/80 bg-slate-950/40 shadow-slate-950/25' 
                  : 'border-slate-200 bg-white shadow-slate-200/50'
              }`}>
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                    isDarkMode ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-100'
                  }`}>
                    📁
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Local Spreadsheet Upload</h3>
                    <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Drag and drop your official <b>"psw09.xls"</b> or <b>"psw09.xlsx"</b> file. Parses full historical metrics for custom series definitions locally.
                    </p>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`p-6 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition duration-200 ${
                      isDarkMode
                        ? 'border-slate-800 bg-slate-900/10 hover:border-sky-500/40 hover:bg-slate-900/20'
                        : 'border-slate-300 bg-slate-50 hover:border-sky-500/40 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Drag file here or click to browse</span>
                    <span className="text-[10px] text-slate-500 mt-1">Accepts .xls and .xlsx files</span>
                  </div>

                  <div className={`p-3 border rounded-xl flex items-start gap-2.5 ${
                    isDarkMode ? 'bg-slate-950/90 border-slate-900' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-[10px] text-sky-450 uppercase tracking-widest font-mono">Download source</h5>
                      <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Grab the workbook directly from the US Department of Energy:
                      </p>
                      <a
                        href="https://www.eia.gov/petroleum/supply/weekly/xls/psw09.xls" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-bold font-mono mt-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download official psw09.xls file
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-3 font-extrabold rounded-xl text-xs duration-200 cursor-pointer border ${
                      isDarkMode
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Browse Device Records
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleFileUpload(f);
                      }
                    }}
                    accept=".xls,.xlsx"
                    className="hidden"
                  />
                  <div className="relative text-center my-1.5">
                    <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-t ${isDarkMode ? 'border-slate-800/85' : 'border-slate-300'}`}></div>
                    <span className={`relative px-3 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest ${isDarkMode ? 'bg-[#08101d]' : 'bg-slate-50'}`}>OR FAST CONNECT</span>
                  </div>
                  <button
                    onClick={() => fetchLiveEiaData(DEFAULT_SERIES.map(s => s.sk), DEFAULT_SERIES)}
                    className="w-full py-3 bg-gradient-to-tr from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 text-emerald-550 font-extrabold rounded-xl text-xs duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⚡ Pull Instantly via Live Gov API
                  </button>
                </div>
              </div>

              {/* Card 2: Live EIA Web API */}
              <div className={`p-8 border rounded-3xl flex flex-col justify-between text-left space-y-6 shadow-xl ${
                isDarkMode 
                  ? 'border-slate-800/80 bg-slate-950/40 shadow-slate-950/25' 
                  : 'border-slate-200 bg-white shadow-slate-200/50'
              }`}>
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                    isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
                  }`}>
                    ⚡
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live EIA Web API Sync</h3>
                    <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Connect directly to the Energy Information Administration API. Fetches real-time weekly data for crude prices, stocks, and production automatically.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[11px] font-mono font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Government EIA API Key:
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="password"
                        placeholder="Paste your API Key (e.g., v2-xxxxxxxxxxxxxxxx)"
                        value={userApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserApiKey(val);
                          safeSetItem('user_eia_api_key', val);
                        }}
                        className={`flex-1 p-3 border rounded-xl text-xs font-mono transition duration-150 ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500'
                            : 'bg-white border-slate-300 text-slate-950 placeholder-slate-400 focus:border-emerald-600'
                        }`}
                      />
                      <button
                        onClick={() => {
                          fetchLiveEiaData(DEFAULT_SERIES.map(s => s.sk), DEFAULT_SERIES);
                        }}
                        className="px-5 py-3 bg-gradient-to-tr from-emerald-600 to-emerald-500 text-slate-950 font-black rounded-xl text-xs duration-200 cursor-pointer shadow-lg shadow-emerald-500/10 hover:scale-[1.02] whitespace-nowrap"
                      >
                        Sync Data
                      </button>
                    </div>
                  </div>

                  <div className={`p-3 border rounded-xl flex items-start gap-2.5 ${
                    isDarkMode ? 'bg-slate-950/90 border-slate-900' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-[10px] text-emerald-450 uppercase tracking-widest font-mono">Register for Key</h5>
                      <p className={`text-[10px] mt-0.5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        No API Key? The government provides free developer API keys to the public:
                      </p>
                      <a
                        href="https://www.eia.gov/opendata/register.php" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-bold font-mono mt-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Register for free EIA API Key
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Sync Data button is now conveniently side-by-side with the entry text box above */}
                </div>
              </div>
            </div>
          </div>
        ) : currentScreen === 'config' ? (
          <SeriesSelectorScreen
            series={seriesList}
            selectedKeys={selectedKeys}
            onApply={(nextKeys) => {
              handleConfigModalApply(nextKeys);
              setCurrentScreen('dashboard');
            }}
            onCancel={() => {
              setCurrentScreen('dashboard');
            }}
            products={productsList}
            isDarkMode={isDarkMode}
            userApiKey={userApiKey}
            onRegisterSeries={(newSeries, dataPoints) => {
              const updatedList = mergeSeriesLists([newSeries], seriesList);
              setSeriesList(updatedList);
              safeSetItem('eia_cached_series', JSON.stringify(updatedList));

              if (dataPoints && dataPoints.length > 0) {
                const updatedDataMap = { ...dataMap, [newSeries.sk]: dataPoints };
                setDataMap(updatedDataMap);
                safeSetItem('eia_cached_datamap', JSON.stringify(updatedDataMap));

                const uniqueYears = new Set<string>();
                Object.values(updatedDataMap).forEach((rows: any) => {
                  rows.forEach((r: any) => uniqueYears.add(r[0].slice(0, 4)));
                });
                const yrsArr = Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
                setAvailableYears(yrsArr);
              }

              const updatedKeys = new Set(selectedKeys);
              updatedKeys.add(newSeries.sk);
              setSelectedKeys(updatedKeys);
              safeSetItem('eia_cached_keys', JSON.stringify(Array.from(updatedKeys)));
            }}
          />
        ) : (
          /* Live Dashboard View */
          <div className="space-y-4">
            
            {/* Horizontal parameters / Ribbon filter shelf */}
            {showFilterShelf ? (
              <div className={`p-4 rounded-3xl border shadow-lg space-y-4 transition-colors duration-200 ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900/10' 
                  : 'border-slate-200 bg-white'
              }`}>
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b transition-colors duration-200 ${
                  isDarkMode ? 'border-slate-800/60' : 'border-slate-100'
                }`}>
                  <div className="flex flex-col sm:flex-row items-baseline gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>Active Configurations</span>
                    <div className="flex items-center gap-2 mt-1 sm:mt-0">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border transition-colors duration-200 ${
                        isDarkMode
                          ? 'text-sky-400 bg-sky-500/10 border-sky-500/25'
                          : 'text-sky-600 bg-sky-50 border-sky-200 shadow-sm'
                      }`}>
                        {selectedKeys.size} filtered lines
                      </span>
                      <button
                        onClick={() => setCurrentScreen('config')}
                        className={`text-xs flex items-center gap-1 font-semibold hover:underline transition-colors duration-200 ${
                          isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        (Edit list)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => setActiveTabSection('cards')}
                      className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center justify-center ${
                        activeTabSection === 'cards'
                          ? isDarkMode
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                            : 'bg-sky-50 text-sky-600 border-sky-200 shadow-sm'
                          : isDarkMode
                            ? 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Card Analysis"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTabSection('table')}
                      className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center justify-center ${
                        activeTabSection === 'table'
                          ? isDarkMode
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                            : 'bg-sky-50 text-sky-600 border-sky-200 shadow-sm'
                          : isDarkMode
                            ? 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Grid Table"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                    <input
                      type="file"
                      ref={headerFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload(f);
                        }
                      }}
                      accept=".xls,.xlsx"
                      className="hidden"
                    />
                    <button
                      onClick={() => headerFileInputRef.current?.click()}
                      className={`p-2.2 rounded-xl border cursor-pointer transition flex items-center justify-center ${
                        isDarkMode
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-950 shadow-sm'
                      }`}
                      title="Upload local spreadsheet"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const allKeys = seriesList.map(s => s.sk);
                        if (allKeys.length > 0) {
                          fetchLiveEiaData(allKeys);
                        } else {
                          fetchLiveEiaData(DEFAULT_SERIES.map(s => s.sk), DEFAULT_SERIES);
                        }
                      }}
                      className={`p-2.2 rounded-xl border cursor-pointer transition flex items-center justify-center ${
                        isDarkMode
                          ? 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-950/35 text-emerald-400 hover:text-emerald-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 hover:text-emerald-900 shadow-sm'
                      }`}
                      title="Refresh and sync datasets"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className={`p-2.2 rounded-xl border cursor-pointer transition flex items-center justify-center ${
                        isFiltersExpanded
                          ? isDarkMode
                            ? 'bg-sky-500/15 border-sky-500/25 text-sky-400'
                            : 'bg-sky-50 border-sky-200 text-sky-600 shadow-sm'
                          : isDarkMode
                            ? 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Toggle parameters panel"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowFilterShelf(false);
                        addToast('Control panel hidden. Restore it anytime using the Show Panel button.', 'info');
                      }}
                      className={`p-2.2 rounded-xl border cursor-pointer transition flex items-center justify-center ${
                        isDarkMode
                          ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-rose-400 hover:text-rose-300'
                          : 'bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600 hover:text-rose-700 shadow-sm'
                      }`}
                      title="Hide entire control panel"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {isFiltersExpanded && (
                <>
                  {/* EIA API sync and credentials slider */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center gap-2.5 min-w-[280px] flex-grow">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">
                        ⚡
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">EIA Live Web API Sync</h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <span>EIA API Status:</span>
                          <span className="font-semibold text-emerald-400">Online</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-grow sm:flex-grow-0">
                      <input
                        type="password"
                        placeholder="Enter personal EIA API Key to override..."
                        value={userApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserApiKey(val);
                          safeSetItem('user_eia_api_key', val);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 w-44"
                        title="User EIA API Key"
                      />
                      <button
                        onClick={() => {
                          const allKeys = seriesList.map(s => s.sk);
                          if (allKeys.length > 0) {
                            fetchLiveEiaData(allKeys);
                          } else {
                            fetchLiveEiaData(DEFAULT_SERIES.map(s => s.sk), DEFAULT_SERIES);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs font-mono flex items-center gap-1 cursor-pointer transition shadow shadow-emerald-700/20"
                        title="Request latest statistics directly from U.S. Government servers"
                      >
                        ⚡ Sync Live Web Records
                      </button>
                    </div>
                  </div>

                  {/* Dynamic live filter arrays - Expanded to 5-col grid to accommodate Range Selector nicely */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
                    
                    {/* Timeline Range Calendars */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>Timeline Calendar</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="flex-1 min-w-0 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                          title="Date From"
                        />
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="flex-1 min-w-0 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                          title="Date To"
                        />
                      </div>

                      {/* Preset Timeline Ranges Shortcuts */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {[
                          { l: '6M', d: -180 },
                          { l: '1Y', d: -365 },
                          { l: '2Y', d: -365 * 2 },
                          { l: '3Y', d: -365 * 3 },
                          { l: '5Y', d: -365 * 5 },
                          { l: '10Y', d: -365 * 10 },
                          { l: 'ALL', d: null }
                        ].map((item) => {
                          const baseDate = latestDate || new Date().toISOString().slice(0, 10);
                          const computedFrom = item.d === null ? '1920-01-01' : dateOffset(baseDate, item.d);
                          const isActive = dateFrom === computedFrom && dateTo === baseDate;
                          return (
                            <button
                              key={item.l}
                              type="button"
                              onClick={() => {
                                if (baseDate) {
                                  setDateTo(baseDate);
                                  setDateFrom(computedFrom);
                                  addToast(`Timeline range changed to Trailing ${item.l}`, 'info');
                                }
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-extrabold tracking-wider border cursor-pointer uppercase transition duration-150 ${
                                isActive
                                  ? 'bg-sky-500/15 border-sky-500 text-sky-400 font-extrabold'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-700'
                              }`}
                            >
                              {item.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Region quick dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-400" />
                          <span>Region / PADD filters</span>
                        </label>
                        {selectedRegions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedRegions([])}
                            className="text-[9px] font-bold text-sky-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                        {[
                          { value: "US", label: "🇺🇸 US Total" },
                          { value: "PADD1", label: "PADD 1 (East)" },
                          { value: "PADD2", label: "PADD 2 (Midwest)" },
                          { value: "PADD3", label: "PADD 3 (Gulf)" },
                          { value: "PADD4", label: "PADD 4 (Rocky)" },
                          { value: "PADD5", label: "PADD 5 (West)" },
                        ].map((opt) => {
                          const isSel = selectedRegions.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setSelectedRegions(selectedRegions.filter(v => v !== opt.value));
                                } else {
                                  setSelectedRegions([...selectedRegions, opt.value]);
                                }
                              }}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                                isSel
                                  ? isDarkMode
                                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-400'
                                    : 'bg-sky-50 border-sky-400 text-sky-700'
                                  : isDarkMode
                                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub Products List Selector */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Extracted Products</span>
                        </label>
                        {selectedProducts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedProducts([])}
                            className="text-[9px] font-bold text-sky-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                        {productsList.length === 0 ? (
                          <span className="text-[10px] text-slate-500 italic mt-1 font-mono">No products extracted</span>
                        ) : (
                          productsList.map((p) => {
                            const isSel = selectedProducts.includes(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedProducts(selectedProducts.filter(v => v !== p));
                                  } else {
                                    setSelectedProducts([...selectedProducts, p]);
                                  }
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                                  isSel
                                    ? isDarkMode
                                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-400'
                                      : 'bg-sky-50 border-sky-400 text-sky-700'
                                    : isDarkMode
                                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-700'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Custom Overlay Comparison years */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                          <span>Overlay Chart Years</span>
                        </label>
                        {chartYears.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setChartYears([])}
                            className="text-[9px] font-bold text-sky-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                        {availableYears.length === 0 ? (
                          <span className="text-[10px] text-slate-500 italic mt-1 font-mono">No years available</span>
                        ) : (
                          availableYears.map((y) => {
                            const isSel = chartYears.includes(y);
                            return (
                              <button
                                key={y}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setChartYears(chartYears.filter(v => v !== y));
                                  } else {
                                    setChartYears([...chartYears, y]);
                                  }
                                }}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer select-none transition-all duration-150 ${
                                  isSel
                                    ? isDarkMode
                                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-450'
                                      : 'bg-sky-50 border-sky-400 text-sky-700'
                                    : isDarkMode
                                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-700'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                }`}
                              >
                                {y}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Range Band Background Years Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>Range Band Years (Min-Max)</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={customStartYear}
                          onChange={(e) => setCustomStartYear(e.target.value)}
                          className="flex-1 min-w-0 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
                          title="Start Year for Range"
                        >
                          {availableYears.map((y) => (
                            <option key={y} value={y}>
                              From: {y}
                            </option>
                          ))}
                        </select>
                        <select
                          value={customEndYear}
                          onChange={(e) => setCustomEndYear(e.target.value)}
                          className="flex-1 min-w-0 p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
                          title="End Year for Range"
                        >
                          {availableYears.map((y) => (
                            <option key={y} value={y}>
                              To: {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[8px] text-slate-500 leading-tight">
                        Controls shaded background min/max bounds.
                      </p>
                    </div>

                  </div>
                </>
              )}
            </div>
            ) : null}

            {/* Pill Selectors Category Tabs */}
            <nav className={`flex items-center gap-1 border-b overflow-x-auto scroller-none py-1.5 whitespace-nowrap transition-colors duration-200 ${
              isDarkMode ? 'border-slate-900' : 'border-slate-200'
            }`}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-bold font-mono tracking-wider rounded-xl transition duration-150 cursor-pointer ${
                    activeTab === tab.key
                      ? isDarkMode
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-sky-50 text-sky-600 border border-sky-200 shadow-sm'
                      : isDarkMode
                        ? 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-900/40'
                        : 'text-slate-600 border border-transparent hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.lbl}
                </button>
              ))}
            </nav>

            {/* Dashboard display panel viewports */}
            {activeTabSeriesList.length === 0 ? (
              <div className={`flex flex-col items-center justify-center p-12 border rounded-3xl transition-colors duration-200 ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900/15 text-slate-500' 
                  : 'border-slate-200 bg-white text-slate-400 shadow-sm'
              }`}>
                <Compass className="w-8 h-8 text-sky-500/40 animate-spin mb-3" />
                <p className="text-xs font-mono">No series in &quot;{TABS.find(t=>t.key === activeTab)?.lbl}&quot; are currently selected.</p>
                <button
                  onClick={() => setCurrentScreen('config')}
                  className={`px-4 py-2 mt-4 font-bold rounded-xl text-xs cursor-pointer transition ${
                    isDarkMode
                      ? 'bg-slate-900 border border-slate-800 hover:border-sky-500 text-sky-400'
                      : 'bg-slate-50 border border-slate-200 hover:border-sky-400 text-sky-600 shadow-sm'
                  }`}
                >
                  Configure Series Database
                </button>
              </div>
            ) : activeTabSection === 'table' ? (
              /* Preset 1: Grid table view */
              <div className="pt-2">
                <DashboardTable
                  series={activeTabSeriesList}
                  data={dataMap}
                  onOpenSingleInsight={(s) => setSelectedSingleSeries(s)}
                />
              </div>
            ) : (
              /* Preset 2: Graphical Analysis Bento Cards / Specialized Native Windows Layout */
              <div className="space-y-6 pt-2">
                {activeTab === 'stocks' && (
                  <StocksWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'refinery' && (
                  <RefineryWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'refinery_prod' && (
                  <RefineryProductionWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'production' && (
                  <ProductionWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'supplied' && (
                  <ProductSuppliedWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {(activeTab === 'imports' || activeTab === 'exports') && (
                  <ImportsExportsWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'prices' && (
                  <PricesWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
                {activeTab === 'others' && (
                  <OthersWindow
                    series={activeTabSeriesList}
                    dataMap={dataMap}
                    isDarkMode={isDarkMode}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    customStartYear={customStartYear}
                    customEndYear={customEndYear}
                    chartYears={chartYears}
                  />
                )}
              </div>
            )}

            {/* AI Market intelligence section centered on selected series */}
            {activeTabSeriesList.length > 0 && (
              <AIAnalystDesk
                activeSeriesList={activeTabSeriesList}
                dataMap={dataMap}
                isDarkMode={isDarkMode}
                selectedSingleSeries={selectedSingleSeries}
                onCloseSingleInsight={() => setSelectedSingleSeries(null)}
                onOpenSingleInsight={(s) => setSelectedSingleSeries(s)}
                dateFrom={dateFrom}
                dateTo={dateTo}
                customStartYear={customStartYear}
                customEndYear={customEndYear}
                chartYears={chartYears}
              />
            )}

          </div>
        )}
      </main>
    </div>
  );
}
