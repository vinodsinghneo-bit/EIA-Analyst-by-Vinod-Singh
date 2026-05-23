import React, { useState, useEffect } from 'react';
import { SeriesInfo } from '../types';
import { fv, chg, valNWeeks, avg4w, ly4wAvg, dateOffset } from '../utils';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Gauge,
  Sliders,
  ChevronRight,
  TrendingDown,
  Printer,
  Mail,
  MessageCircle
} from 'lucide-react';
import { MetricChart } from './MetricChart';

interface AIAnalystDeskProps {
  activeSeriesList: SeriesInfo[];
  dataMap: Record<string, [string, number][]>;
  isDarkMode: boolean;
  selectedSingleSeries: SeriesInfo | null;
  onCloseSingleInsight: () => void;
  onOpenSingleInsight: (series: SeriesInfo) => void;
  // Chronology variables required for proper range/change chart binding
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

// Simple and highly dependable Markdown-to-HTML formatter to keep output visually clean, high-contrast, and beautiful without unnecessary library dependencies
const MarkdownRenderer: React.FC<{ content: string; isDarkMode: boolean }> = ({ content, isDarkMode }) => {
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Clean hashes from all headings and content
      const cleanLine = line.replace(/#/g, '');

      // Headers
      if (line.startsWith('### ')) {
        const textOnly = line.replace('### ', '').replace(/#/g, '').trim();
        return <h4 key={idx} className={`w-full break-words whitespace-normal text-wrap text-sm font-bold mt-4 mb-2 transition-colors duration-200 ${isDarkMode ? 'text-sky-400' : 'text-sky-650'}`}>{textOnly}</h4>;
      }
      if (line.startsWith('## ')) {
        const textOnly = line.replace('## ', '').replace(/#/g, '').trim();
        return <h3 key={idx} className={`w-full break-words whitespace-normal text-wrap text-base font-black mt-5 mb-3 border-b pb-1 transition-colors duration-200 ${isDarkMode ? 'text-sky-305 border-sky-500/10' : 'text-sky-800 border-sky-500/20'}`}>{textOnly}</h3>;
      }
      if (line.startsWith('# ')) {
        const textOnly = line.replace('# ', '').replace(/#/g, '').trim();
        return <h2 key={idx} className={`w-full break-words whitespace-normal text-wrap text-lg font-black mt-6 mb-4 transition-colors duration-200 ${isDarkMode ? 'text-sky-400' : 'text-sky-655'}`}>{textOnly}</h2>;
      }

      // Bold sections (**text**)
      let parsedLine: React.ReactNode = cleanLine;
      if (cleanLine.includes('**')) {
        const parts = cleanLine.split('**');
        parsedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className={`font-extrabold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-sky-955'}`}>{part}</strong> : part);
      }

      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemContent = typeof parsedLine === 'string' ? parsedLine.replace(/^[-*]\s+/, '') : parsedLine;
        return (
          <li key={idx} className={`ml-5 list-disc py-1 text-xs leading-relaxed transition-colors duration-200 w-full break-words whitespace-normal text-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-705'}`}>
            {itemContent}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const cleaned = cleanLine.replace(/^\d+\.\s/, '');
        const boldCleaned = cleaned.includes('**') 
          ? cleaned.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className={`font-extrabold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-sky-950'}`}>{part}</strong> : part)
          : cleaned;
        return (
          <div key={idx} className={`flex gap-2 py-2 items-start text-xs leading-relaxed border-b last:border-0 transition-colors duration-200 w-full break-words whitespace-normal text-wrap ${isDarkMode ? 'border-slate-800/20' : 'border-slate-200/50'}`}>
            <span className={`font-mono text-xs font-bold shrink-0 transition-colors duration-200 ${isDarkMode ? 'text-sky-500' : 'text-sky-600'}`}>{line.match(/^\d+/) && line.match(/^\d+/)![0]}.</span>
            <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{boldCleaned}</div>
          </div>
        );
      }

      // Empty blank lines
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Generic paragraph text (rendered as wrapping div instead of p)
      return <div key={idx} className={`text-xs leading-relaxed mb-2 transition-colors duration-200 w-full break-words whitespace-normal text-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-707'}`}>{parsedLine}</div>;
    });
  };

  return <div className="space-y-1 w-full">{parseMarkdown(content)}</div>;
};

export const AIAnalystDesk: React.FC<AIAnalystDeskProps> = ({
  activeSeriesList,
  dataMap,
  isDarkMode,
  selectedSingleSeries,
  onCloseSingleInsight,
  onOpenSingleInsight,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalInsight, setGlobalInsight] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loadStatusIndex, setLoadStatusIndex] = useState(0);
  const [shareDataLevel, setShareDataLevel] = useState<'full' | 'brief' | 'metrics'>('full');
  
  // Dynamic AI Agent/Model configuration state
  const [selectedAgent, setSelectedAgent] = useState(() => localStorage.getItem('eia_selected_ai_agent') || 'gemini-3.5-flash');
  const [showAiConfig, setShowAiConfig] = useState(false);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    localStorage.setItem('eia_selected_ai_agent', agentId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareToWhatsApp = () => {
    if (!selectedSingleSeries) return;
    const rows = dataMap[selectedSingleSeries.sk];
    if (!rows || rows.length === 0) return;

    const ld = rows[rows.length - 1][0];
    const lv = rows[rows.length - 1][1];
    const wk = valNWeeks(selectedSingleSeries.sk, ld, 1, dataMap);
    const mo = valNWeeks(selectedSingleSeries.sk, ld, 4, dataMap);
    const yr = valNWeeks(selectedSingleSeries.sk, ld, 52, dataMap);
    const cur4W = avg4w(selectedSingleSeries.sk, ld, dataMap);

    const shareTitle = `EIA Petroleum Status: ${selectedSingleSeries.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()} (${selectedSingleSeries.sk})`;
    
    // Clean markdown bold and header elements from inside findings
    const cleanedInsight = singleInsight 
      ? singleInsight.replace(/[*#`_-]/g, '').trim()
      : "Pending AI analysis generation";

    // Precalculate WoW, MoM, YoY string changes safely without complex nesting
    const wowStr = wk !== null 
      ? `${lv - wk >= 0 ? '+' : ''}${fv(lv - wk)} (${lv - wk >= 0 ? '+' : ''}${wk !== 0 ? ((lv - wk) / Math.abs(wk) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    const momStr = mo !== null 
      ? `${lv - mo >= 0 ? '+' : ''}${fv(lv - mo)} (${lv - mo >= 0 ? '+' : ''}${mo !== 0 ? ((lv - mo) / Math.abs(mo) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    const yoyStr = yr !== null 
      ? `${lv - yr >= 0 ? '+' : ''}${fv(lv - yr)} (${lv - yr >= 0 ? '+' : ''}${yr !== 0 ? ((lv - yr) / Math.abs(yr) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    let textToShare = `📊 *${shareTitle}*\n` +
      `-----------------------------------------\n`;

    if (shareDataLevel === 'full' || shareDataLevel === 'brief') {
      textToShare += `💡 *AI DEEP-DIVE ANALYTICS FINDINGS:*\n` +
        `${cleanedInsight}\n\n`;
    }

    if (shareDataLevel === 'full' || shareDataLevel === 'metrics') {
      textToShare += `📈 *MARKET DATA METRIC REAL-TIME SNAPSHOT:*\n` +
        `• Latest Value: ${fv(lv)}\n` +
        `• WoW (1 Wk Change): ${wowStr}\n` +
        `• MoM (4 Wk Change): ${momStr}\n` +
        `• YoY (52 Wk Change): ${yoyStr}\n` +
        `• 4-Wk Trailing Average: ${cur4W !== null ? fv(cur4W) : 'No Data'}\n\n`;
    }

    textToShare += `🔗 *Run live interactive charts & analysis details on:* ${window.location.origin}\n` +
      `-----------------------------------------\n` +
      `Weekly EIA status tracker.`;

    const encodedText = encodeURIComponent(textToShare);
    const url = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareToGmail = () => {
    if (!selectedSingleSeries) return;
    const rows = dataMap[selectedSingleSeries.sk];
    if (!rows || rows.length === 0) return;

    const ld = rows[rows.length - 1][0];
    const lv = rows[rows.length - 1][1];
    const wk = valNWeeks(selectedSingleSeries.sk, ld, 1, dataMap);
    const mo = valNWeeks(selectedSingleSeries.sk, ld, 4, dataMap);
    const yr = valNWeeks(selectedSingleSeries.sk, ld, 52, dataMap);
    const cur4W = avg4w(selectedSingleSeries.sk, ld, dataMap);

    const shareTitle = `EIA Petroleum Status: ${selectedSingleSeries.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()} (${selectedSingleSeries.sk})`;
    
    const cleanedInsight = singleInsight 
      ? singleInsight.replace(/[*#`_-]/g, '').trim()
      : "Pending AI analysis generation";

    const wowStr = wk !== null 
      ? `${lv - wk >= 0 ? '+' : ''}${fv(lv - wk)} (${lv - wk >= 0 ? '+' : ''}${wk !== 0 ? ((lv - wk) / Math.abs(wk) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    const momStr = mo !== null 
      ? `${lv - mo >= 0 ? '+' : ''}${fv(lv - mo)} (${lv - mo >= 0 ? '+' : ''}${mo !== 0 ? ((lv - mo) / Math.abs(mo) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    const yoyStr = yr !== null 
      ? `${lv - yr >= 0 ? '+' : ''}${fv(lv - yr)} (${lv - yr >= 0 ? '+' : ''}${yr !== 0 ? ((lv - yr) / Math.abs(yr) * 100).toFixed(2) : '0.00'}%)`
      : 'No Data';

    const emailSubject = shareTitle;
    let emailBody = `📊 ${shareTitle}\n` +
      `-----------------------------------------\n`;

    if (shareDataLevel === 'full' || shareDataLevel === 'brief') {
      emailBody += `💡 AI DEEP-DIVE ANALYTICS FINDINGS:\n` +
        `${cleanedInsight}\n\n`;
    }

    if (shareDataLevel === 'full' || shareDataLevel === 'metrics') {
      emailBody += `📈 MARKET DATA METRIC REAL-TIME SNAPSHOT:\n` +
        `• Latest Value: ${fv(lv)}\n` +
        `• WoW (1 Wk Change): ${wowStr}\n` +
        `• MoM (4 Wk Change): ${momStr}\n` +
        `• YoY (52 Wk Change): ${yoyStr}\n` +
        `• 4-Wk Trailing Average: ${cur4W !== null ? fv(cur4W) : 'No Data'}\n\n`;
    }

    emailBody += `🔗 Run live interactive charts & analysis details on: ${window.location.origin}\n` +
      `-----------------------------------------\n` +
      `Weekly EIA status tracker.`;

    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBody);
    
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedBody}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Single series insight trackers
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleInsight, setSingleInsight] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  const loadingStatuses = [
    'Parsing weekly inventory logs...',
    'Analyzing seasonal change parameters...',
    'Synthesizing regional PADD product flow correlations...',
    'Consulting Gemini energy market model...',
    'Generating intelligence brief summary...'
  ];

  useEffect(() => {
    let timer: any;
    if (globalLoading || singleLoading) {
      timer = setInterval(() => {
        setLoadStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
      }, 2500);
    } else {
      setLoadStatusIndex(0);
    }
    return () => clearInterval(timer);
  }, [globalLoading, singleLoading]);

  // Extract a concise dataset context helper
  const getSubsetData = (list: SeriesInfo[]) => {
    const statsSubset: Record<string, any> = {};
    list.forEach((s) => {
      const rows = dataMap[s.sk];
      if (rows && rows.length > 0) {
        const ld = rows[rows.length - 1][0];
        const lv = rows[rows.length - 1][1];
        const lastWkVal = valNWeeks(s.sk, ld, 1, dataMap);
        
        let wowChangeAbs = 0;
        let wowChangePct = 0;
        if (lv !== null && lastWkVal !== null) {
          wowChangeAbs = lv - lastWkVal;
          wowChangePct = lastWkVal !== 0 ? (wowChangeAbs / Math.abs(lastWkVal)) * 100 : 0;
        }

        // Get recent 4 weeks historical values
        const historyContext = rows.slice(-4).map(([date, val]) => [date, val]);

        statsSubset[s.sk] = {
          latestDate: ld,
          latestValue: lv,
          wowChangeAbs,
          wowChangePct,
          recentHistory: historyContext,
          unit: s.desc.toLowerCase().includes('price') ? 'Dollars/Gallon' : 'Thousand Barrels'
        };
      }
    });
    return statsSubset;
  };

  // Generate centralized insight for all active items in standard tab
  const handleGenerateGlobalInsights = async () => {
    if (activeSeriesList.length === 0) return;
    setGlobalLoading(true);
    setGlobalError(null);
    setGlobalInsight(null);
    setLoadStatusIndex(0);

    try {
      const dataSubset = getSubsetData(activeSeriesList);
      
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seriesList: activeSeriesList,
          dataSubset,
          model: selectedAgent,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        if (response.status === 429 || resData.isQuotaExceeded) {
          throw new Error(`QUOTA_LIMIT_EXCEEDED: ${resData.details || resData.error}`);
        }
        throw new Error(resData.error || 'Failed to download insights.');
      }

      setGlobalInsight(resData.text);
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || 'Error occurred while contacting the analyst server.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Generate single series insights
  useEffect(() => {
    if (!selectedSingleSeries) {
      setSingleInsight(null);
      setSingleError(null);
      return;
    }

    const fetchSingleInsight = async () => {
      setSingleLoading(true);
      setSingleError(null);
      setSingleInsight(null);
      setLoadStatusIndex(0);

      try {
        const dataSubset = getSubsetData([selectedSingleSeries]);
        
        const response = await fetch('/api/gemini/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seriesList: [selectedSingleSeries],
            dataSubset,
            model: selectedAgent,
          }),
        });

        const resData = await response.json();
        if (!response.ok) {
          if (response.status === 429 || resData.isQuotaExceeded) {
            throw new Error(`QUOTA_LIMIT_EXCEEDED: ${resData.details || resData.error}`);
          }
          throw new Error(resData.error || 'Failed to resolve smart single insights.');
        }

        setSingleInsight(resData.text);
      } catch (err: any) {
        console.error(err);
        setSingleError(err.message || 'Error occurred during intelligence processing.');
      } finally {
        setSingleLoading(false);
      }
    };

    fetchSingleInsight();
  }, [selectedSingleSeries, selectedAgent]);

  return (
    <div className="w-full space-y-6">
      
      {/* Centralized PWA AI Copilot Portal Card at Bottom of Visual Screens */}
      <div className={`mt-8 overflow-hidden rounded-3xl border shadow-2xl relative transition-all duration-200 ${
        isDarkMode
          ? 'border-sky-500/20 bg-gradient-to-tr from-slate-950 via-slate-900/95 to-slate-950/90'
          : 'border-slate-200 bg-gradient-to-tr from-slate-50 via-white to-slate-50 shadow-md'
      } p-5 sm:p-6`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-5 relative z-10 transition-colors duration-200 ${
          isDarkMode ? 'border-sky-500/10' : 'border-slate-200'
        }`}>
          <div className="space-y-1.5 min-w-0-flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono text-sky-400 bg-sky-500/10 uppercase tracking-wider border border-sky-500/20">
                <Bot className="w-3 h-3 text-sky-400 animate-pulse" />
                <span>AI Market Analyst Copilot</span>
              </div>
              
              <button
                onClick={() => setShowAiConfig(!showAiConfig)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black font-mono uppercase tracking-wider border transition-all duration-150 cursor-pointer ${
                  showAiConfig
                    ? 'bg-sky-500/15 border-sky-405 text-sky-455'
                    : isDarkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      : 'bg-slate-100 border-slate-250 text-slate-600 hover:text-slate-900 hover:border-slate-350 bg-white/80 shadow-sm'
                }`}
                title="Configure or switch the active AI agent model"
              >
                <Sliders className="w-2.5 h-2.5 text-sky-450" />
                <span>⚙️ Switch Agent ({selectedAgent === 'gemini-3.5-flash' ? 'Senior' : selectedAgent === 'gemini-3.1-flash-lite' ? 'Lite' : 'Standard'})</span>
              </button>
            </div>
            
            <h3 className={`text-base font-extrabold tracking-tight flex items-center gap-2 transition-colors duration-200 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <span className={`text-xs font-mono font-normal transition-colors duration-200 ${
                isDarkMode ? 'text-sky-450/70' : 'text-sky-600'
              }`}>({activeSeriesList.length} Selected Series Active)</span>
            </h3>
          </div>
          
          <button
            onClick={handleGenerateGlobalInsights}
            disabled={globalLoading || activeSeriesList.length === 0}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition relative z-20 cursor-pointer ${
              globalLoading 
                ? 'bg-slate-900 border border-slate-800 text-slate-500' 
                : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/10 whitespace-nowrap'
            }`}
          >
            {globalLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Generating Intelligence...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>Analyze Selected Data</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Configuration Options to Switch AI Agent / Model */}
        {(showAiConfig || (globalError && globalError.includes("QUOTA_LIMIT_EXCEEDED")) || (singleError && singleError.includes("QUOTA_LIMIT_EXCEEDED"))) && (
          <div className={`mt-4 p-4 rounded-2xl border transition-all duration-200 animate-fade-in ${
            isDarkMode 
              ? 'bg-slate-950/60 border-sky-500/15' 
              : 'bg-slate-50 border-slate-250 shadow-inner text-slate-900'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-3 pb-2 border-b border-sky-500/10">
              <div>
                <h4 className={`text-xs font-black font-mono uppercase tracking-wider ${isDarkMode ? 'text-sky-400' : 'text-sky-700'}`}>
                  🤖 Active Intelligence Model Configuration
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Change your active analytical agent. If your standard model has exhausted its daily API free-tier quotas (RESOURCE_EXHAUSTED), select an alternate fallback specialist agent model below.
                </p>
              </div>
              <button 
                onClick={() => setShowAiConfig(false)}
                className={`p-1 px-2.5 rounded-lg text-[9px] font-bold font-mono border transition duration-150 cursor-pointer ${
                  isDarkMode ? 'border-slate-800 text-slate-500 hover:text-white hover:bg-slate-900' : 'border-slate-250 text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                ✕ Close Panel
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { 
                  id: 'gemini-3.5-flash', 
                  title: 'Senior Market Expert', 
                  tag: 'Primary',
                  desc: 'Utilizes Gemini 3.5 Flash. Comprehensive multi-variable reviews, clinical market catalysts, and price forecasts.',
                  badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                },
                { 
                  id: 'gemini-3.1-flash-lite', 
                  title: 'Lightweight Specialist', 
                  tag: 'Alternate Quota', 
                  desc: 'Uses Gemini 3.1 Flash Lite. Compact, lightning-fast summarization with its own independent daily free quota.',
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                },
                { 
                  id: 'gemini-2.5-flash-image', 
                  title: 'Standard Analyst Advisor', 
                  tag: 'Backup Model',
                  desc: 'Uses Gemini 2.5 Flash. Solid structural summaries. Serves as a perfect secondary option for high-availability requests.',
                  badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                }
              ].map((agent) => {
                const isActive = selectedAgent === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className={`p-3 text-left rounded-xl border transition-all duration-150 flex flex-col justify-between text-xs cursor-pointer ${
                      isActive 
                        ? 'border-sky-500 bg-sky-500/5 ring-1 ring-sky-500 shadow-md' 
                        : isDarkMode
                          ? 'border-slate-800/80 bg-slate-950/25 hover:border-slate-705 hover:bg-slate-900/10'
                          : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-100/55'
                    }`}
                  >
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-extrabold ${isActive ? (isDarkMode ? 'text-white' : 'text-sky-900') : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
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
                    {isActive && (
                      <span className={`text-[9px] font-mono mt-2 font-bold tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-sky-400' : 'text-sky-650'}`}>
                        ● Current Active Agent
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Loading Dashboard screen inside workspace context */}
        {globalLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-sky-500/10 border-t-sky-400 animate-spin"></div>
              <Sparkles className="w-5 h-5 text-sky-400 absolute animate-pulse" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-mono font-bold text-sky-400 animate-pulse">
                {loadingStatuses[loadStatusIndex]}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">Consulting Gemini Analyst on process patterns</p>
            </div>
          </div>
        )}

        {/* Diagnostic Key Error Message */}
        {globalError && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <span className="font-bold block">Intelligence Feed Interrupted</span>
              {globalError.startsWith("QUOTA_LIMIT_EXCEEDED: ") ? (
                <div className="space-y-2 mt-1">
                  <p className="text-amber-500 dark:text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                    ⚠️ API Rate/Quota Limit Exceeded
                  </p>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {globalError.replace("QUOTA_LIMIT_EXCEEDED: ", "")}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    Note: To bypass this limit immediately, you can enter your personal Gemini API Key in the Settings panel of Google AI Studio.
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] leading-relaxed">{globalError}</p>
              )}
            </div>
          </div>
        )}

        {/* Custom Grounded Analytical Narrative Result */}
        {globalInsight && !globalLoading && (
          <div className={`mt-5 p-5 rounded-2xl border relative animate-fade-in transition-all duration-200 ${
            isDarkMode 
              ? 'bg-slate-950/40 border-sky-500/10 text-slate-200' 
              : 'bg-slate-50/50 border-slate-200/80 text-slate-850'
          }`}>
            <div className="absolute top-3 right-3 text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Grounded Market Report</span>
            </div>
            <MarkdownRenderer content={globalInsight} isDarkMode={isDarkMode} />
          </div>
        )}

        {/* Active Grid Index of selected keys for quick-action deep dive */}
        {activeSeriesList.length > 0 && !globalLoading && (
          <div className={`mt-5 pt-5 border-t space-y-3 transition-colors duration-200 ${
            isDarkMode ? 'border-sky-500/10' : 'border-slate-200'
          }`}>
            <h4 className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-200 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Sliders className={`w-3 h-3 transition-colors duration-200 ${
                isDarkMode ? 'text-sky-400' : 'text-sky-600'
              }`} />
              <span>Interactive Series Intelligence Selector</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {activeSeriesList.map((s) => {
                const rows = dataMap[s.sk];
                const lv = rows && rows.length > 0 ? rows[rows.length - 1][1] : null;
                return (
                  <button
                    key={s.sk}
                    onClick={() => onOpenSingleInsight(s)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer ${
                      isDarkMode
                        ? 'border-slate-800 bg-slate-950/20 hover:border-sky-500/30 hover:bg-slate-900/30'
                        : 'border-slate-200 bg-white hover:border-sky-500/40 hover:bg-sky-50/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`font-semibold truncate pr-2 group-hover:text-sky-500 transition-colors duration-150 ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`} title={s.desc}>
                        {s.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                      </div>
                      <span className={`font-mono text-[9px] transition-colors duration-150 ${
                        isDarkMode ? 'text-sky-400/60' : 'text-sky-600/70 font-semibold'
                      }`}>{s.sk} • {lv ? `${fv(lv)}` : 'No Data'}</span>
                    </div>
                    <Sparkles className={`w-3.5 h-3.5 transition transform group-hover:scale-110 ${
                      isDarkMode ? 'text-slate-500 group-hover:text-sky-400' : 'text-slate-400 group-hover:text-sky-500'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Deep-Dive Slideout Drawers / Overlay Modal for Single Series Analysis */}
      {selectedSingleSeries && (
        <div id="deep-dive-print-root" className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in transition-colors duration-200 ${
          isDarkMode ? 'bg-slate-950/80' : 'bg-slate-900/60'
        }`}>
          <div className={`w-full max-w-4xl overflow-hidden rounded-3xl border shadow-2xl relative transition-colors duration-200 ${
            isDarkMode 
              ? 'border-sky-500/20 bg-slate-950 text-white' 
              : 'border-slate-205 bg-white text-slate-800'
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
 
            {/* Modal Header */}
            <div className={`p-5 border-b flex justify-between items-start gap-4 relative z-10 transition-colors duration-200 ${
              isDarkMode 
                ? 'border-slate-900 bg-slate-900/40' 
                : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="space-y-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black font-mono text-sky-400 bg-sky-500/10 uppercase tracking-wider border border-sky-500/20">
                  <BrainCircuit className="w-3 h-3 text-sky-400 animate-spin" />
                  <span></span>
                </div>
                <h3 className={`text-sm font-extrabold tracking-tight w-full break-words whitespace-normal text-wrap transition-colors duration-200 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`} title={selectedSingleSeries.desc}>
                  {selectedSingleSeries.desc.replace(/\s*\([^)]*\)\s*/g, '').trim()}
                </h3>
                <div className={`text-[10px] font-mono whitespace-nowrap transition-colors duration-200 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-550'
                }`}>
                  SOURCE KEY: <span className="text-sky-550 dark:text-sky-400 font-bold">{selectedSingleSeries.sk}</span>
                </div>
              </div>
 
               <div className="flex flex-wrap items-center gap-2">
                {/* Sharing Level Option Toggle */}
                <div className={`no-print flex items-center rounded-xl p-0.5 border text-[9px] font-mono font-bold transition-all ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900/60' 
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <button
                    onClick={() => setShareDataLevel('full')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      shareDataLevel === 'full'
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                    title="Share full analysis: AI deep findings + metric baseline stats"
                  >
                    Full
                  </button>
                  <button
                    onClick={() => setShareDataLevel('brief')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      shareDataLevel === 'brief'
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                    title="Share AI findings report text only"
                  >
                    Findings
                  </button>
                  <button
                    onClick={() => setShareDataLevel('metrics')}
                    className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      shareDataLevel === 'metrics'
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                    }`}
                    title="Share baseline stats indicators only"
                  >
                    Stats
                  </button>
                </div>

                <button
                  onClick={handlePrint}
                  className={`no-print p-2 rounded-xl border transition duration-155 cursor-pointer flex items-center justify-center ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-sky-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                  }`}
                  title="Export, Print or Save this entire analytic screen to high-quality PDF layout"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShareToWhatsApp}
                  className={`no-print p-2 rounded-xl border transition duration-155 cursor-pointer flex items-center justify-center ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-emerald-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-emerald-650 shadow-sm'
                  }`}
                  title={`Share ${shareDataLevel === 'full' ? 'full report' : shareDataLevel === 'brief' ? 'AI findings only' : 'metrics table only'} to WhatsApp`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShareToGmail}
                  className={`no-print p-2 rounded-xl border transition duration-155 cursor-pointer flex items-center justify-center ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-sky-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-sky-650 shadow-sm'
                  }`}
                  title={`Share ${shareDataLevel === 'full' ? 'full report' : shareDataLevel === 'brief' ? 'AI findings only' : 'metrics table only'} to Gmail`}
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  onClick={onCloseSingleInsight}
                  className={`no-print p-2 rounded-xl border transition duration-155 cursor-pointer flex items-center justify-center ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-sm'
                  }`}
                  title="Close Deep-Dive Workspace"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
 
            {/* Modal body */}
            <div id="deep-dive-print-body" className={`p-6 max-h-[72vh] overflow-y-auto scroller relative z-10 space-y-6 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              
              {singleLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-sky-500/10 border-t-sky-400 animate-spin"></div>
                    <Sparkles className="w-4 h-4 text-sky-400 absolute animate-pulse" />
                  </div>
                  <div className="space-y-1 text-center">
                    <div className="text-xs font-mono font-bold text-sky-450 animate-pulse w-full break-words whitespace-normal text-wrap">
                      {loadingStatuses[loadStatusIndex]}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono w-full break-words whitespace-normal text-wrap">Running advanced linear modeling diagnostics</div>
                  </div>
                </div>
              ) : singleError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <span className="font-bold block">Copilot Fetch Error</span>
                    {singleError.startsWith("QUOTA_LIMIT_EXCEEDED: ") ? (
                      <div className="space-y-2 mt-1">
                        <p className="text-amber-500 dark:text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                          ⚠️ API Rate/Quota Limit Exceeded
                        </p>
                        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {singleError.replace("QUOTA_LIMIT_EXCEEDED: ", "")}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                          Note: To bypass this limit immediately, you can enter your personal Gemini API Key in the Settings panel of Google AI Studio.
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px] leading-relaxed w-full break-words whitespace-normal text-wrap">{singleError}</div>
                    )}
                  </div>
                </div>
              ) : singleInsight ? (
                <div className={`space-y-4 animate-fade-in transition-colors duration-200 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <MarkdownRenderer content={singleInsight} isDarkMode={isDarkMode} />
                </div>
              ) : null}
 
              {/* Statistical context table underneath */}
              {!singleLoading && (
                (() => {
                  const rows = dataMap[selectedSingleSeries.sk];
                  if (!rows || rows.length === 0) {
                    return (
                      <div className={`border rounded-2xl p-4 text-center text-xs transition-colors duration-200 ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}>
                        No statistical baseline data available for this series.
                      </div>
                    );
                  }

                  const ld = rows[rows.length - 1][0];
                  const lv = rows[rows.length - 1][1];
                  
                  // Weekly comparisons
                  const wk = valNWeeks(selectedSingleSeries.sk, ld, 1, dataMap);
                  const mo = valNWeeks(selectedSingleSeries.sk, ld, 4, dataMap);
                  const yr = valNWeeks(selectedSingleSeries.sk, ld, 52, dataMap); // same week last year

                  // 4-Week averages
                  const cur4W = avg4w(selectedSingleSeries.sk, ld, dataMap);
                  
                  // Previous Month 4-Week Average (shifted 4 weeks/28 days back)
                  const prev4W = avg4w(selectedSingleSeries.sk, dateOffset(ld, -28), dataMap);
                  
                  // Last Year 4-Week Average (shifted 1 year/364 days back)
                  const ly4W = ly4wAvg(selectedSingleSeries.sk, ld, dataMap);

                  return (
                    <div className={`border rounded-2xl p-4 space-y-4 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'border-slate-900 bg-slate-950/30' 
                        : 'border-slate-150 bg-slate-100/30'
                    }`}>
                      {/* Section 1: Weekly Snapshot */}
                      <div className="space-y-2">
                        <h4 className={`text-[10.5px] font-mono font-bold uppercase tracking-wider pb-1 flex justify-between transition-colors duration-200 border-b ${
                          isDarkMode 
                            ? 'text-slate-400 border-slate-800/40' 
                            : 'text-slate-500 border-slate-200'
                        }`}>
                          <span>Analytical Baseline Signals (Weekly Snapshot)</span>
                          <span className="text-[9px] lowercase opacity-60 font-normal">as of {ld}</span>
                        </h4>
                        <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono transition-colors duration-200 ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase">Latest Value</span>
                            <p className={`font-bold text-sm ${isDarkMode ? 'text-sky-400' : 'text-sky-650'}`}>
                              {fv(lv)}
                            </p>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase">WoW Change</span>
                            <div className="font-bold">
                              {(() => {
                                if (wk !== null) {
                                  const diff = lv - wk;
                                  const pct = wk !== 0 ? (diff / Math.abs(wk)) * 100 : 0;
                                  return (
                                    <>
                                      <span className={diff >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}>
                                        {diff >= 0 ? '+' : ''}{fv(diff)} ({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                                        prev: {fv(wk)}
                                      </span>
                                    </>
                                  );
                                }
                                return <span className="text-slate-400">—</span>;
                              })()}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase">MoM Change</span>
                            <div className="font-bold">
                              {(() => {
                                if (mo !== null) {
                                  const diff = lv - mo;
                                  const pct = mo !== 0 ? (diff / Math.abs(mo)) * 100 : 0;
                                  return (
                                    <>
                                      <span className={diff >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}>
                                        {diff >= 0 ? '+' : ''}{fv(diff)} ({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                                        prev: {fv(mo)}
                                      </span>
                                    </>
                                  );
                                }
                                return <span className="text-slate-400">—</span>;
                              })()}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase">YoY Change</span>
                            <div className="font-bold">
                              {(() => {
                                if (yr !== null) {
                                  const diff = lv - yr;
                                  const pct = yr !== 0 ? (diff / Math.abs(yr)) * 100 : 0;
                                  return (
                                    <>
                                      <span className={diff >= 0 ? 'text-emerald-505 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}>
                                        {diff >= 0 ? '+' : ''}{fv(diff)} ({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                      </span>
                                      <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                                        prev: {fv(yr)}
                                      </span>
                                    </>
                                  );
                                }
                                return <span className="text-slate-400">—</span>;
                              })()}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 uppercase">Category</span>
                            <div className={`font-bold w-full break-words whitespace-normal text-wrap tracking-wide ${
                              isDarkMode ? 'text-sky-450' : 'text-sky-700'
                            }`} title={selectedSingleSeries.cat}>
                              {selectedSingleSeries.cat}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: 4-Week averages */}
                      <div className={`space-y-2 pt-2.5 border-t transition-colors duration-200 ${
                        isDarkMode ? 'border-slate-800/50' : 'border-slate-200'
                      }`}>
                        <h4 className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1">
                          4-Week Average Velocity & Trends (Changes in Percent/Absolute)
                        </h4>
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono transition-colors duration-200 ${
                          isDarkMode ? 'text-white' : 'text-slate-850'
                        }`}>
                          <div className={`space-y-0.5 p-2.5 rounded-xl border transition-colors duration-200 ${
                            isDarkMode 
                              ? 'bg-slate-950/20 border-slate-800/40' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <span className="text-[10px] text-slate-500 uppercase">Current 4W Avg</span>
                            <div className={`font-extrabold text-sm mt-1 transition-colors duration-200 w-full break-words whitespace-normal text-wrap ${
                              isDarkMode ? 'text-sky-450' : 'text-sky-650'
                            }`}>
                              {cur4W !== null ? fv(cur4W) : '—'}
                            </div>
                            <span className="text-[9px] text-slate-500 block mt-1">Trailing 28-day baseline</span>
                          </div>

                          <div className={`space-y-0.5 p-2.5 rounded-xl border transition-colors duration-200 ${
                            isDarkMode 
                              ? 'bg-slate-950/20 border-slate-800/40' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <span className="text-[10px] text-slate-500 uppercase">vs Last Month 4W Avg</span>
                            <div className="font-bold mt-1 w-full break-words whitespace-normal text-wrap">
                              {(() => {
                                if (cur4W !== null && prev4W !== null) {
                                  const diff = cur4W - prev4W;
                                  const pct = prev4W !== 0 ? (diff / Math.abs(prev4W)) * 105 : 0; // Wait, let's keep exact math or 100
                                  const pctCorrect = prev4W !== 0 ? (diff / Math.abs(prev4W)) * 100 : 0;
                                  return (
                                    <span className={diff >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}>
                                      {diff >= 0 ? '+' : ''}{fv(diff)} ({diff >= 0 ? '+' : ''}{pctCorrect.toFixed(2)}%)
                                    </span>
                                  );
                                }
                                return <span className="text-slate-400">—</span>;
                              })()}
                            </div>
                            <span className="text-[9px] text-slate-500 block mt-1">Prev: {prev4W !== null ? fv(prev4W) : '—'}</span>
                          </div>

                          <div className={`space-y-0.5 p-2.5 rounded-xl border transition-colors duration-200 ${
                            isDarkMode 
                              ? 'bg-slate-950/20 border-slate-800/40' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}>
                            <span className="text-[10px] text-slate-500 uppercase">vs Last Year 4W Avg</span>
                            <div className="font-bold mt-1 w-full break-words whitespace-normal text-wrap">
                              {(() => {
                                if (cur4W !== null && ly4W !== null) {
                                  const diff = cur4W - ly4W;
                                  const pct = ly4W !== 0 ? (diff / Math.abs(ly4W)) * 100 : 0;
                                  return (
                                    <span className={diff >= 0 ? 'text-emerald-510 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}>
                                      {diff >= 0 ? '+' : ''}{fv(diff)} ({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                                    </span>
                                  );
                                }
                                return <span className="text-slate-505">—</span>;
                              })()}
                            </div>
                            <span className="text-[9px] text-slate-500 block mt-1">Last year avg: {ly4W !== null ? fv(ly4W) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Range & Change Analysis Charts inside Deep-Dive window - High Resolution Print-Safe block */}
              {!singleLoading && selectedSingleSeries && dataMap[selectedSingleSeries.sk] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-200 dark:border-slate-800 chart-print-block">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                      Historical Range Reference (Weekly Range)
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Historical range band constructed from trailing years min/max baseline compared with active seasonal overlay records.
                    </p>
                    <div className="h-64 sm:h-72 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 rounded-2xl p-3">
                      <MetricChart
                        type="range"
                        sk={selectedSingleSeries.sk}
                        desc={selectedSingleSeries.desc}
                        cat={selectedSingleSeries.cat}
                        data={dataMap[selectedSingleSeries.sk]}
                        isDarkMode={isDarkMode}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        customStartYear={customStartYear}
                        customEndYear={customEndYear}
                        chartYears={chartYears}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">
                      Change Analysis & Volatility Spree
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Rolling weekly differences, 4-week changes, and seasonal standard deviation ranges tracking systematic velocity trends.
                    </p>
                    <div className="h-64 sm:h-72 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 rounded-2xl p-3">
                      <MetricChart
                        type="chg"
                        sk={selectedSingleSeries.sk}
                        desc={selectedSingleSeries.desc}
                        cat={selectedSingleSeries.cat}
                        data={dataMap[selectedSingleSeries.sk]}
                        isDarkMode={isDarkMode}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        customStartYear={customStartYear}
                        customEndYear={customEndYear}
                        chartYears={chartYears}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
