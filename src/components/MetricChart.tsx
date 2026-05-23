/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Maximize2, Download, Table } from 'lucide-react';
import { fv, avg4w, prev4wAvg, ly4wAvg, valNWeeks, getWeekNumber } from '../utils';

// Register standard Chart.js controllers and the datalabels plugin
Chart.register(...registerables, ChartDataLabels);

interface MetricChartProps {
  type: 'chg' | 'trend' | 'monthly' | 'range';
  sk: string;
  desc: string;
  cat: string;
  data: [string, number][]; // Raw historical data [["YYYY-MM-DD", value], ...]
  isDarkMode: boolean;
  dateFrom: string;
  dateTo: string;
  customStartYear: string;
  customEndYear: string;
  chartYears: string[];
}

export const MetricChart: React.FC<MetricChartProps> = ({
  type,
  sk,
  desc,
  cat,
  data: rawData,
  isDarkMode,
  dateFrom,
  dateTo,
  customStartYear,
  customEndYear,
  chartYears,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalChartRef = useRef<Chart | null>(null);

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Common configuration generator to ensure matching visualization logic
  const getChartConfig = (ctx: CanvasRenderingContext2D, isModal: boolean) => {
    const themeText = isDarkMode ? '#e2e8f0' : '#0f172a';
    const themeGrid = isDarkMode ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const palColors = ['#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb7185', '#6ee7b7', '#fbbf24', '#60a5fa', '#4ade80'];

    const fontSize = isModal ? 11 : 9;

    let config: any = {};

    if (type === 'chg') {
      const rows = rawData;
      const ld = rows[rows.length - 1][0];
      const lv = rows[rows.length - 1][1];

      const wk = valNWeeks(sk, ld, 1, { [sk]: rows });
      const mo = valNWeeks(sk, ld, 4, { [sk]: rows });
      const yr = valNWeeks(sk, ld, 52, { [sk]: rows });
      const a4 = avg4w(sk, ld, { [sk]: rows });
      const pa = prev4wAvg(sk, ld, { [sk]: rows });
      const la = ly4wAvg(sk, ld, { [sk]: rows });

      const pts = [
        { lbl: 'vs Last Wk', abs: wk !== null ? lv - wk : null, pct: wk ? ((lv - wk) / Math.abs(wk)) * 100 : null },
        { lbl: 'vs Last Mo', abs: mo !== null ? lv - mo : null, pct: mo ? ((lv - mo) / Math.abs(mo)) * 100 : null },
        { lbl: 'vs Last Yr', abs: yr !== null ? lv - yr : null, pct: yr ? ((lv - yr) / Math.abs(yr)) * 100 : null },
        { lbl: '4Wk vs Prev', abs: (a4 !== null && pa !== null) ? a4 - pa : null, pct: pa ? ((a4 - pa) / Math.abs(pa)) * 100 : null },
        { lbl: '4Wk vs LY', abs: (a4 !== null && la !== null) ? a4 - la : null, pct: la ? ((a4 - la) / Math.abs(la)) * 100 : null },
      ].filter((p) => p.abs !== null);

      const bgcols = pts.map((p) => (p.abs !== null && p.abs >= 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.7)'));
      const brcols = pts.map((p) => (p.abs !== null && p.abs >= 0 ? '#34d399' : '#f87171'));

      config = {
        type: 'bar',
        data: {
          labels: pts.map((p) => p.lbl),
          datasets: [
            {
              data: pts.map((p) => p.abs),
              backgroundColor: bgcols,
              borderColor: brcols,
              borderWidth: 1.5,
              borderRadius: 5,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: isModal ? 45 : 35, bottom: isModal ? 30 : 25 } },
          plugins: {
            legend: { display: false },
            datalabels: {
              display: true,
              clip: false,
              color: themeText,
              font: { size: isModal ? 11 : 9.5, family: "monospace", weight: '600' },
              formatter: (v: any, c: any) => {
                const p = pts[c.dataIndex];
                if (v === null || v === undefined) return '';
                return (v >= 0 ? '+' : '') + fv(v) + (p.pct !== null ? `\n${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(1)}%` : '');
              },
              anchor: (c: any) => (c.dataset.data[c.dataIndex] >= 0 ? 'end' : 'start'),
              align: (c: any) => (c.dataset.data[c.dataIndex] >= 0 ? 'top' : 'bottom'),
              padding: 2,
              offset: 4,
              textAlign: 'center',
            },
            tooltip: {
              backgroundColor: isDarkMode ? 'rgba(15, 28, 46, 0.97)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              borderWidth: 1,
              titleFont: { size: fontSize },
              bodyFont: { size: fontSize },
              padding: 10,
              cornerRadius: 8,
              titleColor: isDarkMode ? '#e2e8f0' : '#0f172a',
              bodyColor: isDarkMode ? '#94a3b8' : '#334155',
              callbacks: {
                label: (c: any) => {
                  const p = pts[c.dataIndex];
                  return ` ${c.label}: ${c.raw >= 0 ? '+' : ''}${fv(c.raw)}${p.pct !== null ? ` (${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(1)}%)` : ''}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize } },
            },
            y: {
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize }, callback: (v: any) => fv(v) },
            },
          },
        },
        plugins: [ChartDataLabels],
      };
    } else if (type === 'trend') {
      const filtered = rawData.filter((r) => (!dateFrom || r[0] >= dateFrom) && (!dateTo || r[0] <= dateTo));
      const col = palColors[0];

      const gr = ctx.createLinearGradient(0, 0, 0, isModal ? 400 : 195);
      gr.addColorStop(0, col + '44');
      gr.addColorStop(1, col + '00');

      const unit = (desc.match(/\(([^)]+)\)/) || ['', ''])[1];

      config = {
        type: 'line',
        data: {
          labels: filtered.map((r) => r[0]),
          datasets: [
            {
              label: sk,
              data: filtered.map((r) => r[1]),
              borderColor: col,
              backgroundColor: gr,
              borderWidth: 2,
              pointRadius: isModal ? 2 : 0,
              pointHoverRadius: 6,
              pointHitRadius: 10,
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
              backgroundColor: isDarkMode ? 'rgba(15, 28, 46, 0.97)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              titleColor: isDarkMode ? '#e2e8f0' : '#0f172a',
              bodyColor: isDarkMode ? '#94a3b8' : '#334155',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 10,
              callbacks: {
                title: (cs: any[]) => 'Date: ' + cs[0].label,
                label: (c: any) => ` ${sk}: ${fv(c.raw)} ${unit || ''}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize }, maxTicksLimit: isModal ? 18 : 10, maxRotation: 0 },
            },
            y: {
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize }, callback: (v: any) => fv(v) },
            },
          },
          interaction: { mode: 'index', intersect: false },
        },
      };
    } else if (type === 'monthly') {
      const filtered = rawData.filter((r) => (!dateFrom || r[0] >= dateFrom) && (!dateTo || r[0] <= dateTo));
      const mmap: Record<string, number[]> = {};
      filtered.forEach((r) => {
        const m = r[0].slice(0, 7);
        if (!mmap[m]) mmap[m] = [];
        mmap[m].push(r[1]);
      });

      const months = Object.keys(mmap).sort();
      const vals = months.map((m) => {
        const a = mmap[m];
        return a.reduce((x, y) => x + y, 0) / a.length;
      });

      const unit = (desc.match(/\(([^)]+)\)/) || ['', ''])[1];
      const col = palColors[2];

      config = {
        type: 'bar',
        data: {
          labels: months.map((m) => {
            const d = new Date(m + '-15');
            return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          }),
          datasets: [
            {
              data: vals,
              backgroundColor: col + '55',
              borderColor: col,
              borderWidth: 1.5,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: 25 } },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
              backgroundColor: isDarkMode ? 'rgba(15, 28, 46, 0.97)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              titleColor: isDarkMode ? '#e2e8f0' : '#0f172a',
              bodyColor: isDarkMode ? '#94a3b8' : '#334155',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 10,
              callbacks: {
                label: (c: any) => ` Average: ${fv(c.raw)} ${unit || ''}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#4b6280', font: { size: fontSize }, maxRotation: 45, maxTicksLimit: isModal ? 24 : 14 },
            },
            y: {
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize }, callback: (v: any) => fv(v) },
            },
          },
        },
      };
    } else if (type === 'range') {
      const labels: string[] = [];
      for (let i = 1; i <= 52; i++) labels.push('W' + i);

      const latestDataDate = rawData[rawData.length - 1][0];
      const latestYear = parseInt(latestDataDate.slice(0, 4));

      let activeChartYears = chartYears;
      if (activeChartYears.length === 0) {
        activeChartYears = [latestYear.toString(), (latestYear - 1).toString()];
      }

      let startRangeYear = latestYear - 4;
      let endRangeYear = latestYear;
      if (customStartYear && customEndYear) {
        startRangeYear = Math.min(parseInt(customStartYear), parseInt(customEndYear));
        endRangeYear = Math.max(parseInt(customStartYear), parseInt(customEndYear));
      }

      const weekDataGrouped: Record<number, number[]> = {};
      rawData.forEach((r) => {
        const yr = parseInt(r[0].slice(0, 4));
        if (yr >= startRangeYear && yr <= endRangeYear) {
          const wkNum = getWeekNumber(r[0]);
          if (wkNum >= 1 && wkNum <= 52) {
            if (!weekDataGrouped[wkNum]) weekDataGrouped[wkNum] = [];
            weekDataGrouped[wkNum].push(r[1]);
          }
        }
      });

      const maxPoints: { x: string; y: number | null }[] = [];
      const minPoints: { x: string; y: number | null }[] = [];
      for (let i = 1; i <= 52; i++) {
        const vals = weekDataGrouped[i];
        if (vals && vals.length) {
          maxPoints.push({ x: 'W' + i, y: Math.max(...vals) });
          minPoints.push({ x: 'W' + i, y: Math.min(...vals) });
        } else {
          maxPoints.push({ x: 'W' + i, y: null });
          minPoints.push({ x: 'W' + i, y: null });
        }
      }

      const gradientFill = ctx.createLinearGradient(0, 0, 0, isModal ? 450 : 250);
      gradientFill.addColorStop(0, isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)');
      gradientFill.addColorStop(1, isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)');

      const rangeDesc = `${startRangeYear} to ${endRangeYear}`;
      const rangeDataset = {
        label: `${rangeDesc} Range`,
        data: maxPoints,
        fill: { target: 'stack', above: gradientFill },
        pointRadius: 0,
        borderWidth: 0,
        backgroundColor: '#94a3b8',
        tension: 0.2,
        pointStyle: 'rectRounded',
        stack: 'rangeStack',
      };

      const minPointsDataset = {
        label: '_minBoundary',
        data: minPoints,
        pointRadius: 0,
        borderWidth: 0,
        fill: false,
        backgroundColor: 'transparent',
        tension: 0.2,
        stack: 'rangeStack',
      };

      const lineDatasets: any[] = [];
      activeChartYears.forEach((yr, idx) => {
        const yrData = rawData.filter((r) => r[0].startsWith(yr));
        if (!yrData.length) return;
        const yrWeekPoints = new Array(52).fill(null);
        yrData.forEach((r) => {
          const wkNum = getWeekNumber(r[0]);
          if (wkNum >= 1 && wkNum <= 52) yrWeekPoints[wkNum - 1] = r[1];
        });

        const isPriorityYear = parseInt(yr) === Math.max(...activeChartYears.map((y) => parseInt(y)));
        lineDatasets.push({
          label: `Year ${yr}`,
          data: yrWeekPoints,
          borderColor: palColors[idx % palColors.length],
          borderWidth: isModal ? 2.5 : 2,
          pointRadius: isPriorityYear ? (isModal ? 5 : 4) : 0,
          pointBackgroundColor: isPriorityYear ? palColors[idx % palColors.length] : 'transparent',
          fill: false,
          tension: 0.3,
          order: 1,
          pointStyle: 'circle',
        });
      });

      const unit = (desc.match(/\(([^)]+)\)/) || ['', ''])[1];

      config = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [minPointsDataset, rangeDataset, ...lineDatasets],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: 25 } },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: themeText,
                font: { size: fontSize },
                usePointStyle: true,
                filter: (item: any) => item.text && item.text !== '_minBoundary' && item.text !== 'undefined',
              },
            },
            datalabels: { display: false },
            tooltip: {
              backgroundColor: isDarkMode ? 'rgba(15, 28, 46, 0.97)' : 'rgba(255, 255, 255, 0.97)',
              borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 10,
              titleColor: isDarkMode ? '#e2e8f0' : '#0f172a',
              bodyColor: isDarkMode ? '#94a3b8' : '#334155',
              filter: (item: any) => item.dataset.label !== '_minBoundary',
              callbacks: {
                title: (cs: any[]) => 'Abstract Week: ' + cs[0].label,
                label: (c: any) => {
                  if (c.dataset.label.includes('Range')) {
                    const minPoint = minPoints[c.dataIndex]?.y;
                    const maxPoint = typeof c.raw === 'object' && c.raw !== null ? (c.raw as any).y : c.raw;
                    if (minPoint === null || maxPoint === null || minPoint === undefined || maxPoint === undefined) return null;
                    return ` ${rangeDesc}: ${fv(minPoint)} - ${fv(maxPoint)}`;
                  } else {
                    const val = typeof c.raw === 'object' && c.raw !== null ? (c.raw as any).y : c.raw;
                    return ` ${c.dataset.label}: ${fv(val)} ${unit || ''}`;
                  }
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: {
                color: '#4b6280',
                font: { size: fontSize },
                maxRotation: 0,
                callback: (val: any, index: number) => {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  if ((index + 1) % 4 === 1) return months[Math.floor(index / 12 * 3)];
                  return '';
                },
              },
            },
            y: {
              stacked: false,
              grid: { color: themeGrid },
              ticks: { color: '#4b6280', font: { size: fontSize }, callback: (v: any) => fv(v) },
            },
          },
          interaction: { mode: 'index', intersect: false },
        },
      };
    }

    const customCanvasBg = {
      id: 'customCanvasBg',
      beforeDraw: (chartInstance: Chart) => {
        const { ctx: c } = chartInstance;
        c.save();
        c.globalCompositeOperation = 'destination-over';
        c.fillStyle = isDarkMode ? '#0f172e' : '#ffffff';
        c.fillRect(0, 0, chartInstance.width, chartInstance.height);
        c.restore();
      },
    };

    config.plugins = config.plugins || [];
    config.plugins.push(customCanvasBg);

    return config;
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = "";
    const filename = `${sk}_${type}_data.csv`;

    if (type === 'chg') {
      const rows = rawData;
      if (!rows || rows.length < 2) return;
      const ld = rows[rows.length - 1][0];
      const lv = rows[rows.length - 1][1];

      const wk = valNWeeks(sk, ld, 1, { [sk]: rows });
      const mo = valNWeeks(sk, ld, 4, { [sk]: rows });
      const yr = valNWeeks(sk, ld, 52, { [sk]: rows });
      const a4 = avg4w(sk, ld, { [sk]: rows });
      const pa = prev4wAvg(sk, ld, { [sk]: rows });
      const la = ly4wAvg(sk, ld, { [sk]: rows });

      const pts = [
        { lbl: 'vs Last Wk', abs: wk !== null ? lv - wk : null, pct: wk ? ((lv - wk) / Math.abs(wk)) * 100 : null },
        { lbl: 'vs Last Mo', abs: mo !== null ? lv - mo : null, pct: mo ? ((lv - mo) / Math.abs(mo)) * 100 : null },
        { lbl: 'vs Last Yr', abs: yr !== null ? lv - yr : null, pct: yr ? ((lv - yr) / Math.abs(yr)) * 105 : null },
        { lbl: '4Wk vs Prev', abs: (a4 !== null && pa !== null) ? a4 - pa : null, pct: pa ? ((a4 - pa) / Math.abs(pa)) * 100 : null },
        { lbl: '4Wk vs LY', abs: (a4 !== null && la !== null) ? a4 - la : null, pct: la ? ((a4 - la) / Math.abs(la)) * 100 : null },
      ].filter((p) => p.abs !== null);

      const unit = (desc.match(/\(([^)]+)\)/) || ['', ''])[1];
      csvContent = `Comparison Metric,Absolute Change (${unit || 'value'}),Percent Change (%)\n`;
      pts.forEach(p => {
        csvContent += `"${p.lbl}",${p.abs},${p.pct !== null ? p.pct.toFixed(2) : ""}\n`;
      });
    } else if (type === 'trend' || type === 'monthly') {
      const filtered = rawData.filter((r) => (!dateFrom || r[0] >= dateFrom) && (!dateTo || r[0] <= dateTo));
      if (type === 'monthly') {
        const mmap: Record<string, number[]> = {};
        filtered.forEach((r) => {
          const m = r[0].slice(0, 7);
          if (!mmap[m]) mmap[m] = [];
          mmap[m].push(r[1]);
        });
        const months = Object.keys(mmap).sort();
        csvContent = "Month,Average Value\n";
        months.forEach((m) => {
          const a = mmap[m];
          const avg = a.reduce((x, y) => x + y, 0) / a.length;
          csvContent += `${m},${avg.toFixed(2)}\n`;
        });
      } else {
        csvContent = "Date,Value\n";
        filtered.forEach(r => {
          csvContent += `${r[0]},${r[1]}\n`;
        });
      }
    } else if (type === 'range') {
      const latestDataDate = rawData[rawData.length - 1][0];
      const latestYear = parseInt(latestDataDate.slice(0, 4));
      let activeChartYears = chartYears;
      if (activeChartYears.length === 0) {
        activeChartYears = [latestYear.toString(), (latestYear - 1).toString()];
      }
      let startRangeYear = latestYear - 4;
      let endRangeYear = latestYear;
      if (customStartYear && customEndYear) {
        startRangeYear = Math.min(parseInt(customStartYear), parseInt(customEndYear));
        endRangeYear = Math.max(parseInt(customStartYear), parseInt(customEndYear));
      }

      const weekDataGrouped: Record<number, number[]> = {};
      rawData.forEach((r) => {
        const yr = parseInt(r[0].slice(0, 4));
        if (yr >= startRangeYear && yr <= endRangeYear) {
          const wkNum = getWeekNumber(r[0]);
          if (wkNum >= 1 && wkNum <= 52) {
            if (!weekDataGrouped[wkNum]) weekDataGrouped[wkNum] = [];
            weekDataGrouped[wkNum].push(r[1]);
          }
        }
      });

      csvContent = `Week,Min Range (${startRangeYear}-${endRangeYear}),Max Range (${startRangeYear}-${endRangeYear})`;
      activeChartYears.forEach(yr => {
        csvContent += `,Year ${yr}`;
      });
      csvContent += "\n";

      for (let i = 1; i <= 52; i++) {
        const vals = weekDataGrouped[i] || [];
        const minVal = vals.length ? Math.min(...vals) : "";
        const maxVal = vals.length ? Math.max(...vals) : "";
        csvContent += `W${i},${minVal},${maxVal}`;

        activeChartYears.forEach(yr => {
          const yrData = rawData.filter((r) => r[0].startsWith(yr));
          const matchRow = yrData.find(r => getWeekNumber(r[0]) === i);
          csvContent += `,${matchRow ? matchRow[1] : ""}`;
        });
        csvContent += "\n";
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JPEG/PNG Image Handlers
  const handleExportImage = () => {
    if (!chartRef.current) return;
    const base64 = chartRef.current.toBase64Image();
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${sk}_${type}_chart.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportImageModal = () => {
    if (!modalChartRef.current) return;
    const base64 = modalChartRef.current.toBase64Image();
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${sk}_${type}_large_chart.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mini Chart Sizing Canvas Instance Hook
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    if (!rawData || rawData.length < 2) return;

    const config = getChartConfig(ctx, false);
    const newChart = new Chart(ctx, config);
    chartRef.current = newChart;

    return () => {
      newChart.destroy();
    };
  }, [type, sk, desc, cat, rawData, isDarkMode, dateFrom, dateTo, customStartYear, customEndYear, chartYears]);

  // Expanded Modal Canvas Instance Hook
  useEffect(() => {
    if (!isExpanded || !modalCanvasRef.current) return;

    if (modalChartRef.current) {
      modalChartRef.current.destroy();
    }

    const ctx = modalCanvasRef.current.getContext('2d');
    if (!ctx) return;
    if (!rawData || rawData.length < 2) return;

    const config = getChartConfig(ctx, true);
    const newChart = new Chart(ctx, config);
    modalChartRef.current = newChart;

    return () => {
      newChart.destroy();
    };
  }, [isExpanded, type, sk, desc, cat, rawData, isDarkMode, dateFrom, dateTo, customStartYear, customEndYear, chartYears]);

  return (
    <>
      {/* Smart Fluid-Sizing layout: breaks out to 100vw exact edges on Mobile, looks native and cozy on Desktop */}
      <div className="flex flex-col border border-slate-200/50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/25 sm:rounded-2xl overflow-hidden -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full">
        {/* Canvas Visual Viewport */}
        <div className="relative w-full h-[23vh] min-h-[160px] max-h-[250px] p-2">
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>

        {/* Dynamic, self-contained interactive toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-mono text-slate-500">
          <span className="font-bold tracking-wider text-slate-400 dark:text-slate-600 block uppercase">
            {type === 'chg' ? 'Wk Delta' : type}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1.5 hover:text-sky-400 hover:scale-105 duration-100 cursor-pointer text-[9.5px] font-black"
              title="Expand chart to high-definition overlay window"
            >
              <Maximize2 size={11} className="text-slate-400" />
              <span>Expand</span>
            </button>
            <span className="text-slate-200 dark:text-slate-800">|</span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 hover:text-emerald-500 hover:scale-105 duration-100 cursor-pointer text-[9.5px] font-black"
              title="Download raw dataset source values as CSV spreadsheet File"
            >
              <Table size={11} className="text-slate-400" />
              <span>CSV</span>
            </button>
            <span className="text-slate-200 dark:text-slate-800">|</span>
            <button
              onClick={handleExportImage}
              className="flex items-center gap-1.5 hover:text-purple-500 hover:scale-105 duration-100 cursor-pointer text-[9.5px] font-black"
              title="Save active layout view as PNG image representation"
            >
              <Download size={11} className="text-slate-400" />
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen High Definition Chart Overlay Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title Block Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-900/60 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-widest text-sky-400 bg-sky-400/10 uppercase">
                  {cat} Metric Model
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight pr-4">
                  {desc}
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Government EIA series ID: <span className="text-emerald-400 font-bold">{sk}</span> • {type.toUpperCase()} Analysis Type
                </p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-red-500 hover:text-white transition duration-150 flex items-center justify-center text-slate-500 cursor-pointer"
                title="Close fullscreen view"
              >
                ✕
              </button>
            </div>

            {/* Modal Screen-relative High-DPI canvas area */}
            <div className="p-4 bg-white dark:bg-slate-900 h-[45vh] min-h-[300px] max-h-[500px] relative overflow-hidden flex-grow">
              <canvas ref={modalCanvasRef} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem', bottom: '1.5rem', width: 'calc(100% - 3rem)', height: 'calc(100% - 3rem)' }} />
            </div>

            {/* Modal Action Controls Banner Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-900/60 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="text-[10px] text-slate-500 font-mono">
                <span>Dataset active values: <b>{rawData.length}</b> rows total.</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 transition duration-100 cursor-pointer text-xs"
                >
                  <Table size={13} />
                  <span>Download CSV Sheet</span>
                </button>
                <button
                  onClick={handleExportImageID => handleExportImageModal()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 transition duration-100 cursor-pointer text-xs"
                >
                  <Download size={13} />
                  <span>Save Image (PNG)</span>
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition duration-100 cursor-pointer text-xs"
                >
                  Close Screen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
