/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { getRegion, getProductFromDesc, getUnitsForSeries } from '../utils';
import {
  ArrowLeft,
  Check,
  Search,
  Filter,
  CheckSquare,
  Square,
  Globe,
  Tag,
  FolderOpen,
  MapPin,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  FileCheck,
  Building,
  Layers,
  Plus,
  Loader2,
  Database,
  Key,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { SeriesInfo, TabKey } from '../types';

interface SeriesSelectorScreenProps {
  series: SeriesInfo[];
  selectedKeys: Set<string>;
  onApply: (nextKeys: Set<string>) => void;
  onCancel: () => void;
  products: string[];
  isDarkMode: boolean;
  onRegisterSeries: (newSeries: SeriesInfo, dataPoints?: [string, number][]) => void;
  userApiKey: string;
}

export const SeriesSelectorScreen: React.FC<SeriesSelectorScreenProps> = ({
  series,
  selectedKeys,
  onApply,
  onCancel,
  products,
  isDarkMode,
  onRegisterSeries,
  userApiKey,
}) => {
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set(selectedKeys));
  const [search, setSearch] = useState('');
  const [pivotOrder, setPivotOrder] = useState<'cat' | 'pivot'>('cat');

  // Local filter states for Area (Region) and Product bifurcation
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Custom Series registration state
  const [customSk, setCustomSk] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCat, setCustomCat] = useState<TabKey>('stocks');
  const [isRegistrarLoading, setIsRegistrarLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [registrationMsg, setRegistrationMsg] = useState<{ type: 'success' | 'err'; text: string } | null>(null);
  const [resolvedMeta, setResolvedMeta] = useState<{ desc: string; units: string; dataCount: number } | null>(null);
  const [lastFetchedData, setLastFetchedData] = useState<[string, number][] | null>(null);

  // Dynamic AI Agent/Model configuration state
  const [localAgent, setLocalAgent] = useState(() => localStorage.getItem('eia_selected_ai_agent') || 'gemini-3.5-flash');

  const handleSelectAgent = (agentId: string) => {
    setLocalAgent(agentId);
    localStorage.setItem('eia_selected_ai_agent', agentId);
  };

  const CATEGORY_MAP: Record<TabKey, string> = {
    stocks: 'Stocks',
    refinery: 'Refinery Activity',
    refinery_prod: 'Refinery Production',
    production: 'Production',
    supplied: 'Product Supplied',
    imports: 'Imports',
    exports: 'Exports',
    prices: 'Prices',
    others: 'Others'
  };

  const handleEiaLookup = async () => {
    if (!customSk.trim()) {
      setRegistrationMsg({ type: 'err', text: 'Please enter a valid EIA Series ID.' });
      return;
    }
    const cleanSk = customSk.trim().toUpperCase();
    setIsRegistrarLoading(true);
    setRegistrationMsg(null);
    setResolvedMeta(null);
    setLastFetchedData(null);

    try {
      const response = await fetch('/api/eia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eia-api-key': userApiKey,
        },
        body: JSON.stringify({
          series: [cleanSk],
          apiKey: userApiKey || undefined
        })
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'The series could not be found or validated in the EIA database.');
      }

      const points = json.results?.[cleanSk];
      if (!points || !Array.isArray(points) || points.length === 0) {
        throw new Error(`The EIA API connected successfully but returned 0 data points for "${cleanSk}".`);
      }

      const meta = json.metadata?.[cleanSk] || { desc: `EIA Series ${cleanSk}`, units: 'Thousand Barrels' };

      setResolvedMeta({
        desc: meta.desc,
        units: meta.units,
        dataCount: points.length
      });
      setLastFetchedData(points);
      setCustomDesc(meta.desc);
      setRegistrationMsg({ type: 'success', text: `Series found in U.S. EIA Database with ${points.length} weekly history points!` });
    } catch (err: any) {
      console.error(err);
      setRegistrationMsg({ type: 'err', text: err?.message || 'Verification failed. Please check your API key & Series ID.' });
    } finally {
      setIsRegistrarLoading(false);
    }
  };

  const handleRegister = () => {
    if (!customSk.trim()) return;
    const cleanSk = customSk.trim().toUpperCase();
    
    // Fallback if manual or fallback values
    const descToUse = customDesc.trim() || resolvedMeta?.desc || `Custom EIA Series ${cleanSk}`;
    const mappedCategory = CATEGORY_MAP[customCat] || 'Others';

    const newSeries: SeriesInfo = {
      sk: cleanSk,
      desc: descToUse,
      cat: mappedCategory
    };

    onRegisterSeries(newSeries, lastFetchedData || undefined);

    // Auto-select immediately
    const nextKeys = new Set(localKeys);
    nextKeys.add(cleanSk);
    setLocalKeys(nextKeys);

    // Clean up forms
    setCustomSk('');
    setCustomDesc('');
    setResolvedMeta(null);
    setLastFetchedData(null);
    setRegistrationMsg({ type: 'success', text: `Successfully saved and registered Series ID "${cleanSk}" into "${mappedCategory}"!` });
  };

  // Sync initial state
  useEffect(() => {
    setLocalKeys(new Set(selectedKeys));
  }, [selectedKeys]);

  const handleToggle = (sk: string) => {
    const next = new Set(localKeys);
    if (next.has(sk)) {
      next.delete(sk);
    } else {
      next.add(sk);
    }
    setLocalKeys(next);
  };

  const handleSelectAll = (filteredSeries: SeriesInfo[]) => {
    const next = new Set(localKeys);
    filteredSeries.forEach((s) => next.add(s.sk));
    setLocalKeys(next);
  };

  const handleClearAll = (filteredSeries: SeriesInfo[]) => {
    const next = new Set(localKeys);
    filteredSeries.forEach((s) => next.delete(s.sk));
    setLocalKeys(next);
  };

  const handleSelectUS = () => {
    const next = new Set<string>();
    series.forEach((s) => {
      const d = s.desc.toUpperCase();
      const isUs =
        (d.includes('U.S.') || d.includes('UNITED STATES')) &&
        !d.includes('EAST COAST') &&
        !d.includes('MIDWEST') &&
        !d.includes('GULF COAST') &&
        !d.includes('ROCKY') &&
        !d.includes('WEST COAST') &&
        !d.includes('PADD');
      if (isUs) {
        next.add(s.sk);
      }
    });
    setLocalKeys(next);
  };

  // Region bifurcation definitions
  const allRegions = [
    { key: 'US', label: 'United States (US Total)' },
    { key: 'PADD1', label: 'PADD 1 (East Coast)' },
    { key: 'PADD2', label: 'PADD 2 (Midwest)' },
    { key: 'PADD3', label: 'PADD 3 (Gulf Coast)' },
    { key: 'PADD4', label: 'PADD 4 (Rocky Mountain)' },
    { key: 'PADD5', label: 'PADD 5 (West Coast)' },
  ];

  // Specific products list for explicit checkboxes
  const productBifurcations = useMemo(() => {
    const defaultProds = [
      'Crude Oil',
      'Finished Motor Gasoline',
      'Distillate Fuel Oil',
      'Kerosene-Type Jet Fuel',
      'Propane/Propylene',
      'Residual Fuel Oil',
      'Other Products'
    ];
    // Gather any others from product list
    const actualSet = new Set<string>(defaultProds);
    products.forEach(p => {
      if (p && p.trim() && p !== 'Other Products') {
        // Find if matches any template
        const matched = defaultProds.some(dp => dp.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(dp.toLowerCase()));
        if (!matched) {
          actualSet.add(p);
        }
      }
    });
    return Array.from(actualSet);
  }, [products]);

  // Worksheet Categories
  const categoriesList = [
    'Stocks',
    'Refinery Activity',
    'Refinery Production',
    'Production',
    'Product Supplied',
    'Imports',
    'Exports',
    'Prices',
    'Others'
  ];

  // Helper toggle functions
  const toggleRegion = (reg: string) => {
    setSelectedRegions(prev => 
      prev.includes(reg) ? prev.filter(r => r !== reg) : [...prev, reg]
    );
  };

  const toggleProduct = (prod: string) => {
    setSelectedProducts(prev => 
      prev.includes(prod) ? prev.filter(p => p !== prod) : [...prev, prod]
    );
  };

  const toggleCat = (cat: string) => {
    setSelectedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Filter logic
  const filteredSeriesList = useMemo(() => {
    const searchTerms = search
      .toLowerCase()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return series.filter((s) => {
      // Search term
      if (searchTerms.length > 0) {
        const descMatch = searchTerms.some((term) => s.desc.toLowerCase().includes(term));
        const skMatch = searchTerms.some((term) => s.sk.toLowerCase().includes(term));
        if (!descMatch && !skMatch) return false;
      }

      // Area/Region filtering
      if (selectedRegions.length > 0) {
        const r = getRegion(s.desc);
        if (!selectedRegions.includes(r)) return false;
      }

      // Product filtering
      if (selectedProducts.length > 0) {
        const sProd = getProductFromDesc(s.desc).toLowerCase();
        const matchesProd = selectedProducts.some((p) => {
          if (p === 'Other Products') {
            const isStandard = ['crude oil', 'gasoline', 'distillate', 'jet fuel', 'propane', 'residual'].some(
              st => sProd.includes(st)
            );
            return !isStandard;
          }
          return sProd.includes(p.toLowerCase()) || p.toLowerCase().includes(sProd);
        });
        if (!matchesProd) return false;
      }

      // Worksheet Category filtering
      if (selectedCats.length > 0) {
        if (!selectedCats.includes(s.cat)) return false;
      }

      return true;
    });
  }, [series, search, selectedRegions, selectedProducts, selectedCats]);

  // Pivot list grouper helper
  const groupedData = useMemo(() => {
    const list: any = {};
    if (pivotOrder === 'pivot') {
      filteredSeriesList.forEach((s) => {
        const r = getRegion(s.desc);
        const p = getProductFromDesc(s.desc);
        if (!list[s.cat]) list[s.cat] = {};
        if (!list[s.cat][r]) list[s.cat][r] = {};
        if (!list[s.cat][r][p]) list[s.cat][r][p] = [];
        list[s.cat][r][p].push(s);
      });
    } else {
      filteredSeriesList.forEach((s) => {
        if (!list[s.cat]) list[s.cat] = [];
        list[s.cat].push(s);
      });
    }
    return list;
  }, [filteredSeriesList, pivotOrder]);

  return (
    <div className="space-y-6 pb-24 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Configure Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <button
            onClick={onCancel}
            className="group inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-500 transition-colors mb-2 cursor-pointer font-mono"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight">
            EIA Database Series Configurator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select, toggle, and retain multiple weekly petroleum status indicators. Supports full local spreadsheet data and live government APIs.
          </p>
        </div>
        
        {/* Statistics badge & Search Order */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl border border-slate-350 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold">
            <span className="text-slate-600 dark:text-slate-400 mr-1.5">Selected:</span>
            <span className="text-sky-600 dark:text-sky-400 font-extrabold">{localKeys.size}</span>
            <span className="text-slate-400 dark:text-slate-600 mx-1">/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">{series.length} loaded</span>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 cursor-pointer transition uppercase font-mono"
            title="Cancel changes and return to main dashboard"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(localKeys)}
            className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-sky-500/15 flex items-center gap-1.5 cursor-pointer transition uppercase font-mono"
            title="Apply selected filters and save dashboard config"
          >
            <FileCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>

      {/* Dynamic EIA Database Search and Custom Registrar Box */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900/40 border border-amber-500/20 dark:border-amber-500/10 rounded-3xl shadow-md space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-500 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <span>Direct EIA Database Search & Custom Key Registrar</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-normal px-2 py-0.5 rounded border border-amber-500/20 font-sans tracking-normal uppercase">APK & Persistent Custom Search Ready</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
              Quickly retrieve, index, and permanently save custom weekly petroleum metrics. Input any official U.S. EIA Series ID (e.g., <code className="text-amber-500/90 font-mono font-black select-all text-[11px]">PET.WCRSTUS1.W</code> for crude inventories, or <code className="text-amber-500/90 font-mono font-black select-all text-[11px]">RWTC</code> for crude prices). The application will retrieve its description, convert it to fit your chosen dashboard tab, and save it to your system.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Inputs Panel */}
          <div className="lg:col-span-7 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-400 font-mono uppercase tracking-wider block">1. Enter EIA Series Key / ID</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. WCRSTUS1 or PET.WCRSTUS1.W"
                    value={customSk}
                    onChange={(e) => {
                      setCustomSk(e.target.value);
                      setRegistrationMsg(null);
                      setResolvedMeta(null);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-150 border border-slate-350 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-400 font-mono uppercase tracking-wider block">2. Target Dashboard Section</label>
                <select
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value as TabKey)}
                  className="w-full p-2 text-xs bg-slate-150 border border-slate-355 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 font-bold cursor-pointer"
                >
                  <option value="stocks">🗄️ Stocks</option>
                  <option value="refinery">⚙️ Refinery Activity</option>
                  <option value="refinery_prod">⚙️ Refinery Production</option>
                  <option value="production">🏗️ Production</option>
                  <option value="supplied">📈 Product Supplied</option>
                  <option value="imports">🚢 Imports</option>
                  <option value="exports">🚢 Exports</option>
                  <option value="prices">💵 Prices</option>
                  <option value="others">📦 Others</option>
                </select>
              </div>
            </div>

            {/* Toggle Manual Override */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manual-override-checkbox"
                checked={isManualMode}
                onChange={(e) => {
                  setIsManualMode(e.target.checked);
                  setRegistrationMsg(null);
                }}
                className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
              />
              <label htmlFor="manual-override-checkbox" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                Can&apos;t connect to API? Compose series descriptions and add manually
              </label>
            </div>

            {isManualMode && (
              <div className="p-3 bg-slate-100 dark:bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-amber-500 font-mono uppercase">Provide Custom Human-Readable Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly U.S. Custom Stock Analysis Series (Thousand Barrels)"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-350 dark:border-slate-850 rounded-xl font-medium text-slate-900 dark:text-slate-100"
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  *Manual registration will save this key placeholder instantly of any server database requests. You can upload custom excel data or reload later.
                </p>
              </div>
            )}

            {/* Action Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!isManualMode ? (
                <button
                  onClick={handleEiaLookup}
                  disabled={isRegistrarLoading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer select-none font-mono uppercase"
                >
                  {isRegistrarLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Search & Validate Key</span>
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-450 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer select-none font-mono uppercase"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Custom Series</span>
                </button>
              )}
            </div>
          </div>

          {/* Outputs / Server Insights Feedback Panel */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-black/35 rounded-2xl border border-slate-200 dark:border-slate-900 p-4 flex flex-col justify-between gap-3 min-h-[140px]">
            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Series Lookup Status</h5>
              
              {registrationMsg && (
                <div className={`p-2.5 rounded-xl text-xs border ${
                  registrationMsg.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-400'
                }`}>
                  {registrationMsg.text}
                </div>
              )}

              {!registrationMsg && !resolvedMeta && (
                <div className="text-slate-500 text-xs italic py-4">
                  Awaiting series lookup execution. Provide your free EIA API key in Settings or input manually above.
                </div>
              )}

              {resolvedMeta && (
                <div className="space-y-2 bg-slate-100 dark:bg-slate-955/50 p-2.5 border border-slate-300 dark:border-slate-900 rounded-xl text-xs animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">Validation Passed</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px] text-slate-650 dark:text-slate-400">
                    <p className="line-clamp-2"><b>Desc:</b> <span className="text-slate-950 dark:text-slate-200 font-sans font-semibold">{resolvedMeta.desc}</span></p>
                    <p><b>Unit Type:</b> <span className="text-amber-600 dark:text-amber-400 font-bold">{resolvedMeta.units}</span></p>
                    <p><b>History records:</b> <span className="text-sky-600 dark:text-sky-400 font-bold">{resolvedMeta.dataCount} weeks found</span></p>
                  </div>
                </div>
              )}
            </div>

            {resolvedMeta && !isManualMode && (
              <button
                onClick={handleRegister}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer font-mono uppercase flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Series permanently to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic AI Agent Switcher Section */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950/70 dark:to-slate-900/40 border border-purple-500/20 dark:border-purple-500/10 rounded-3xl shadow-md space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <span>🤖 AI Market Analyst Agent Configuration</span>
              <span className="text-[10px] bg-purple-500/10 text-purple-500 dark:text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-500/20 font-sans tracking-normal uppercase">Quota Auto-Recovery</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl font-medium">
              Select which model powers your AI Market Analyst Copilot. If you temporarily hit the daily free-tier limit (<code className="font-mono text-amber-500 text-[11px]">RESOURCE_EXHAUSTED</code>/Error 429) or notice intelligence feed errors, switch to one of the secondary/alternate specialist models below. Each model operates on an independent daily rate limit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {[
            { 
              id: 'gemini-3.5-flash', 
              title: 'Senior Market Expert', 
              tag: 'Primary Model',
              desc: 'Comprehensive multi-variable reviews, strategic fuel price forecasts, and historical energy trends.',
              badgeColor: 'text-sky-450 bg-sky-500/10 border-sky-500/20'
            },
            { 
              id: 'gemini-3.1-flash-lite', 
              title: 'Lightweight Specialist', 
              tag: 'Alternate Quota', 
              desc: 'High summarization speed, perfect for quick single-series reviews and high-availability backup requests.',
              badgeColor: 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20'
            },
            { 
              id: 'gemini-2.5-flash-image', 
              title: 'Standard Analyst Advisor', 
              tag: 'Backup Model',
              desc: 'Reliable structural summaries. Resilient secondary support level to completely maintain uptime.',
              badgeColor: 'text-purple-450 bg-purple-500/10 border-purple-500/20'
            }
          ].map((agent) => {
            const isActive = localAgent === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleSelectAgent(agent.id)}
                className={`p-4 text-left rounded-2xl border transition-all duration-150 flex flex-col justify-between text-xs cursor-pointer ${
                  isActive 
                    ? 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500 shadow-md' 
                    : isDarkMode
                      ? 'border-slate-800/80 bg-slate-950/25 hover:border-slate-700 hover:bg-slate-900/10'
                      : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-100/55'
                }`}
              >
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-extrabold ${isActive ? (isDarkMode ? 'text-white' : 'text-purple-600') : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                      {agent.title}
                    </span>
                    <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${agent.badgeColor}`}>
                      {agent.tag}
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {agent.desc}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-500/10 w-full">
                  <span className={`text-[9px] font-mono font-bold tracking-wider ${isActive ? 'text-purple-500 dark:text-purple-400' : 'text-slate-500'}`}>
                    {isActive ? '● ACTIVE AGENT' : 'SELECT AGENT'}
                  </span>
                  {isActive && <Check className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Division: Sidebar + Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Panel Sidebar Filters (Box Segregation) */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Box 1: Pre-set actions */}
          <div className="p-4 bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-350 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-[10px] font-bold text-slate-750 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
              <span>Quick Commands</span>
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSelectAll(filteredSeriesList)}
                className="w-full text-left p-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-medium border border-slate-205 dark:border-slate-800 transition text-slate-800 dark:text-slate-250 cursor-pointer flex justify-between items-center"
              >
                <span>Select All Filtered</span>
                <span className="text-[10px] bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 px-1.5 py-0.2 rounded font-mono font-bold">
                  +{filteredSeriesList.length}
                </span>
              </button>
              <button
                onClick={() => handleClearAll(filteredSeriesList)}
                className="w-full text-left p-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-medium border border-slate-205 dark:border-slate-800 transition text-slate-800 dark:text-slate-250 cursor-pointer flex justify-between items-center"
              >
                <span>Clear All Filtered</span>
                <span className="text-[10px] bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 px-1.5 py-0.2 rounded font-mono font-bold">
                  -{filteredSeriesList.size || filteredSeriesList.length}
                </span>
              </button>
              <button
                onClick={handleSelectUS}
                className="w-full text-left p-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-bold border border-slate-250 dark:border-slate-800 bg-sky-50/50 dark:bg-sky-950/15 text-sky-600 dark:text-sky-400 transition cursor-pointer flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Reset to U.S.-Only Total</span>
              </button>
            </div>
          </div>

          {/* Box 2: Area / Region Bifurcation Checklist */}
          <div className="p-4 bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-350 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-[10px] font-bold text-slate-750 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>Bifurcate by Area (Region)</span>
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {allRegions.map((reg) => {
                const checked = selectedRegions.includes(reg.key);
                return (
                  <label
                    key={reg.key}
                    onClick={() => toggleRegion(reg.key)}
                    className={`flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border cursor-pointer select-none transition-all text-xs ${
                      checked
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400 font-bold'
                        : 'border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-850 text-slate-805 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="accent-amber-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="truncate">{reg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Box 3: Product Type Bifurcation Checklist */}
          <div className="p-4 bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-350 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-[10px] font-bold text-slate-750 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bifurcate by Product Type</span>
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {productBifurcations.map((prod) => {
                const checked = selectedProducts.includes(prod);
                return (
                  <label
                    key={prod}
                    onClick={() => toggleProduct(prod)}
                    className={`flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border cursor-pointer select-none transition-all text-xs ${
                      checked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-bold'
                        : 'border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-850 text-slate-805 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="truncate">{prod}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Box 4: Worksheet Categories selection */}
          <div className="p-4 bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-350 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-[10px] font-bold text-slate-750 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Filter by Category</span>
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {categoriesList.map((cat) => {
                const checked = selectedCats.includes(cat);
                return (
                  <label
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={`flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border cursor-pointer select-none transition-all text-xs ${
                      checked
                        ? 'bg-sky-500/10 border-sky-450 text-sky-700 dark:text-sky-400 font-bold'
                        : 'border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-850 text-slate-850 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="accent-sky-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Panel Main Data Listings (Box Segregation & High Contrast Grid) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Search box and grouping pivot bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center p-4 bg-white dark:bg-slate-900/30 border border-slate-350 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search EIA descriptions, raw source keys (supports comma separated, e.g. WCRSTUS1, RWTC...)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs pl-10 pr-4 py-3 rounded-2xl text-slate-950 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <select
              value={pivotOrder}
              onChange={(e) => setPivotOrder(e.target.value as any)}
              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-305 dark:border-slate-800 rounded-2xl text-xs text-sky-655 dark:text-sky-400 font-bold focus:outline-none focus:border-sky-500 cursor-pointer w-full sm:w-auto font-mono"
            >
              <option value="cat">📦 Group by Category Name</option>
              <option value="pivot">🗺️ Hierarchical Pivot (Cat &gt; Region &gt; Product)</option>
            </select>
          </div>

          {/* Results summary indicators */}
          <div className="flex justify-between items-center px-2">
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
              Showing <b className="text-slate-900 dark:text-slate-200">{filteredSeriesList.length}</b> series matching current filters
            </span>
            {(selectedRegions.length > 0 || selectedProducts.length > 0 || selectedCats.length > 0 || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedRegions([]);
                  setSelectedProducts([]);
                  setSelectedCats([]);
                }}
                className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-450 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Main List Rendering */}
          <div className="space-y-6">
            {filteredSeriesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/5 text-slate-500">
                <span className="text-4xl mb-3 animate-bounce">🔍</span>
                <p className="text-sm font-bold">No petroleum data series matches current configuration.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try resetting the bifurcated area/product options on the sidebar.</p>
              </div>
            ) : pivotOrder === 'pivot' ? (
              // Pivot Hierarchical rendering
              Object.keys(groupedData).sort().map((cat) => (
                <div key={cat} className="space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-sky-550 dark:text-sky-400 border-b-2 border-slate-300 dark:border-sky-500/20 pb-1 mt-4">
                    {cat} Group Base
                  </h3>
                  
                  {Object.keys(groupedData[cat]).sort().map((reg) => (
                    <div key={reg} className="space-y-3 pl-1">
                      {Object.keys(groupedData[cat][reg]).sort().map((prod) => {
                        const items = groupedData[cat][reg][prod] as SeriesInfo[];
                        if (!items || !items.length) return null;

                        return (
                          <div key={prod} className="space-y-2 p-4 bg-slate-50/70 dark:bg-slate-900/10 border border-slate-250 dark:border-slate-800/80 rounded-2xl">
                            <div className="text-[10.5px] font-mono font-extrabold text-[#f59e0b] dark:text-[#f59e0b] uppercase tracking-wide flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{reg === 'US' ? 'United States Total' : reg} • {prod} ({items.length} series)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                              {items.map((s) => {
                                const unit = getUnitsForSeries(s.sk, s.desc, s.cat);
                                const regionCode = getRegion(s.desc);
                                const productType = getProductFromDesc(s.desc);
                                const isChecked = localKeys.has(s.sk);

                                return (
                                  <label
                                    key={s.sk}
                                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer select-none transition-all duration-150 shadow-sm ${
                                      isChecked
                                        ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-450 dark:border-sky-450 text-slate-900 dark:text-white ring-1 ring-sky-305'
                                        : 'bg-white dark:bg-slate-950/40 border-slate-300 dark:border-slate-900 hover:border-slate-400 dark:hover:border-slate-800 text-slate-900 dark:text-slate-200'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 accent-sky-500 h-4.5 w-4.5 cursor-pointer flex-shrink-0"
                                      checked={isChecked}
                                      onChange={() => handleToggle(s.sk)}
                                    />
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex gap-1.5 flex-wrap items-center">
                                        <span className="font-mono text-[10.5px] font-extrabold text-sky-600 dark:text-sky-400 truncate bg-sky-500/5 px-1 rounded">{s.sk}</span>
                                        <span className="text-[8.5px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-905 rounded font-bold text-slate-600 dark:text-slate-400 uppercase">
                                          {regionCode}
                                        </span>
                                      </div>
                                      <div className="text-xs font-bold leading-snug text-slate-950 dark:text-slate-100 whitespace-normal break-words text-wrap">
                                        {s.desc}
                                      </div>
                                      
                                      {/* Units representation detail */}
                                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                                        <div className="text-[9.5px] font-bold text-slate-550 dark:text-slate-500 font-mono">
                                          Unit: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{unit}</span>
                                        </div>
                                        <div className="text-[8.5px] font-mono text-slate-450 whitespace-normal break-words">
                                          Prod: {productType}
                                        </div>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              // Standard grouped rendering (By Category)
              categoriesList.map((cat) => {
                const items = groupedData[cat] as SeriesInfo[];
                if (!items || !items.length) return null;

                return (
                  <div key={cat} className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-900/10 border border-slate-250 dark:border-slate-800 rounded-3xl">
                    <div className="text-xs font-bold text-amber-620 dark:text-amber-400 uppercase pb-1 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800">
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      <span>{cat} • {items.length} Options</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {items.map((s) => {
                        const unit = getUnitsForSeries(s.sk, s.desc, s.cat);
                        const regionCode = getRegion(s.desc);
                        const productType = getProductFromDesc(s.desc);
                        const isChecked = localKeys.has(s.sk);

                        return (
                          <label
                            key={s.sk}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer select-none transition-all duration-150 shadow-sm ${
                              isChecked
                                ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-450 dark:border-sky-450 text-slate-950 dark:text-white ring-1 ring-sky-305'
                                : 'bg-white dark:bg-slate-950/40 border-slate-300 dark:border-slate-900 hover:border-slate-400 dark:hover:border-slate-800 text-slate-905 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-sky-500 h-4.5 w-4.5 cursor-pointer flex-shrink-0"
                              checked={isChecked}
                              onChange={() => handleToggle(s.sk)}
                            />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex gap-1.5 flex-wrap items-center">
                                <span className="font-mono text-[10.5px] font-extrabold text-sky-600 dark:text-sky-450 truncate bg-sky-500/5 px-1 rounded">{s.sk}</span>
                                <span className="text-[8.5px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-905 rounded font-bold text-slate-600 dark:text-slate-450 uppercase">
                                  {regionCode}
                                </span>
                              </div>
                              <div className="text-xs font-bold leading-snug text-slate-950 dark:text-slate-100 whitespace-normal break-words text-wrap">
                                {s.desc}
                              </div>

                              {/* Unit / Product representation attributes */}
                              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                                <div className="text-[9.5px] font-bold text-slate-550 dark:text-slate-500 font-mono">
                                  Unit: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{unit}</span>
                                </div>
                                <div className="text-[8.5px] font-mono text-slate-450 whitespace-normal break-words">
                                  Prod: {productType}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Sticky Bottom Apply Action footer bar */}
      <div className="fixed bottom-0 left-0 right-0 py-3.5 px-4 bg-slate-950/90 border-t border-slate-900 backdrop-blur-md z-50 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400 leading-none">Selected Indicators Filter State</p>
            <h4 className="text-xs font-black text-sky-400 mt-1.5 flex items-center gap-1.5">
              <span>{localKeys.size} metrics active</span>
              {localKeys.size !== selectedKeys.size && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-500/15 border border-yellow-500/35 text-yellow-500 rounded font-mono uppercase">
                  Changed
                </span>
              )}
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 font-mono">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-bold ring-1 ring-slate-800 cursor-pointer transition uppercase"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(localKeys)}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-sky-500/15 flex items-center gap-1.5 cursor-pointer transition uppercase"
            >
              <FileCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
