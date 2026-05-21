import React, { useState } from "react";
import { BarChart, LineChart, PieChart, TrendingUp, Info } from "lucide-react";

interface ChartProps {
  type: string; // "bar" | "line" | "pie" | "scatter" | "dashboard"
  title: string;
  data: any[];
  xAxisKey: string;
  yAxisKey: string;
  colors?: string[];
}

export default function VisualChart({
  type,
  title,
  data,
  xAxisKey,
  yAxisKey,
  colors = ["#3b82f6", "#06b6d4", "#f97316", "#ef4444", "#8b5cf6", "#4b5563"]
}: ChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-lg bg-white/[0.02] p-6 text-center">
        <Info className="w-8 h-8 text-white/20 mb-2" />
        <h3 className="font-sans font-medium text-white/80">Analytical Matrix Empty</h3>
        <p className="font-sans text-xs text-white/40 mt-1 max-w-xs">Upload a CSV or choose a preset to generate active visual dashboards instantly.</p>
      </div>
    );
  }

  // Aggregate or map data for visualization, limit to top 8 items to prevent cluttered layouts
  const chartDataRaw = data.slice(0, 10).map((item, idx) => {
    const xName = String(item[xAxisKey] ?? `Row ${idx + 1}`);
    const yVal = parseFloat(String(item[yAxisKey] || 0));
    return {
      name: xName.length > 15 ? xName.substring(0, 15) + "..." : xName,
      value: isNaN(yVal) ? 0 : yVal,
      original: item
    };
  });

  const values = chartDataRaw.map(d => d.value);
  const maxVal = Math.max(...values, 1) * 1.15; // padding for spacing
  const minVal = Math.min(...values, 0);

  // SVG dimensions
  const width = 500;
  const height = 280;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Custom coordinate projections
  const getX = (index: number) => {
    return paddingLeft + (index / (chartDataRaw.length - 1 || 1)) * plotWidth;
  };

  const getBarX = (index: number) => {
    const barWidth = plotWidth / chartDataRaw.length;
    return paddingLeft + index * barWidth + barWidth * 0.15;
  };

  const getY = (val: number) => {
    const scale = (val - minVal) / (maxVal - minVal || 1);
    return height - paddingBottom - scale * plotHeight;
  };

  const renderYAxisGridAndLabels = () => {
    const ticks = 4;
    return Array.from({ length: ticks + 1 }).map((_, i) => {
      const tickVal = minVal + (i / ticks) * (maxVal - minVal);
      const y = getY(tickVal);
      return (
        <g key={`y-tick-${i}`} className="opacity-80">
          <line
            x1={paddingLeft}
            y1={y}
            x2={width - paddingRight}
            y2={y}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
          <text
            x={paddingLeft - 8}
            y={y + 4}
            textAnchor="end"
            className="font-mono text-[10px] fill-white/40 font-medium"
          >
            {tickVal >= 1000 ? `${(tickVal / 1000).toFixed(1)}k` : tickVal.toFixed(1)}
          </text>
        </g>
      );
    });
  };

  const renderXAxisLabels = () => {
    return chartDataRaw.map((d, i) => {
      let x = 0;
      if (type === "line" || type === "scatter") {
        x = getX(i);
      } else {
        // bar
        const barWidth = plotWidth / chartDataRaw.length;
        x = getBarX(i) + (barWidth * 0.7) / 2;
      }

      return (
        <text
          key={`x-label-${i}`}
          x={x}
          y={height - paddingBottom + 16}
          textAnchor="middle"
          transform={`rotate(-12, ${x}, ${height - paddingBottom + 16})`}
          className="font-sans text-[10px] fill-white/40 font-medium tracking-tight"
        >
          {d.name}
        </text>
      );
    });
  };

  const renderBarChart = () => {
    const barWidth = (plotWidth / chartDataRaw.length) * 0.7;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {renderYAxisGridAndLabels()}
        {chartDataRaw.map((d, i) => {
          const x = getBarX(i);
          const y = getY(d.value);
          const barHeight = Math.max(0, getY(0) - y);
          const color = colors[i % colors.length];

          return (
            <g
              key={`bar-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer transition-all duration-300"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="4"
                className="transition-all duration-300 hover:brightness-95 hover:filter hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                opacity={hoveredIdx === null || hoveredIdx === i ? 0.95 : 0.45}
              />
              {hoveredIdx === i && (
                <g>
                  <rect
                    x={x + barWidth / 2 - 50}
                    y={y - 35}
                    width="100"
                    height="24"
                    rx="4"
                    fill="#0A0A0B"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 20}
                    textAnchor="middle"
                    className="font-sans text-[10px] text-white font-semibold fill-white"
                  >
                    {d.value.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {renderXAxisLabels()}
        {/* baseline */}
        <line
          x1={paddingLeft}
          y1={getY(0)}
          x2={width - paddingRight}
          y2={getY(0)}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const renderLineChart = () => {
    let pathD = "";
    chartDataRaw.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.value);
      if (i === 0) {
        pathD = `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
    });

    // Area path helper
    const areaD = `${pathD} L ${getX(chartDataRaw.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {renderYAxisGridAndLabels()}
        
        {/* Area fill */}
        <path
          d={areaD}
          fill="url(#lineGridGradient)"
          opacity="0.25"
          className="transition-opacity duration-300"
        />
        <defs>
          <linearGradient id="lineGridGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Action trend line */}
        <path
          d={pathD}
          fill="none"
          stroke={colors[0]}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_4px_8px_rgba(99,102,241,0.2)]"
        />

        {/* Chart points */}
        {chartDataRaw.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);

          return (
            <g
              key={`dot-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 6 : 4}
                fill="#141417"
                stroke={colors[0]}
                strokeWidth="2.5"
                className="transition-all duration-200"
              />
              {hoveredIdx === i && (
                <g>
                  <rect
                    x={x - 50}
                    y={y - 35}
                    width="100"
                    height="24"
                    rx="4"
                    fill="#0A0A0B"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    className="font-sans text-[10px] text-white font-semibold fill-white"
                  >
                    {d.value.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {renderXAxisLabels()}
        {/* baseline */}
        <line
          x1={paddingLeft}
          y1={getY(0)}
          x2={width - paddingRight}
          y2={getY(0)}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const renderPieChart = () => {
    // Pie calculation
    const total = chartDataRaw.reduce((sum, item) => sum + item.value, 0);
    let startAngle = 0;

    const cx = width / 2;
    const cy = height / 2 - 10;
    const r = 85;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {chartDataRaw.map((d, i) => {
          if (total === 0) return null;
          const percentage = d.value / total;
          const angle = percentage * 360;

          // Compute coordinates
          const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);

          const endAngle = startAngle + angle;
          const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
          const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathDef = `
            M ${cx} ${cy}
            L ${x1} ${y1}
            A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}
            Z
          `;

          // Increment starting point
          const currentStart = startAngle;
          startAngle = endAngle;

          const color = colors[i % colors.length];

          return (
            <g
              key={`pie-slice-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <path
                d={pathDef}
                fill={color}
                opacity={hoveredIdx === null || hoveredIdx === i ? 0.95 : 0.45}
                stroke="#141417"
                strokeWidth="1.5"
                className="transition-all duration-200 hover:scale-105 transform origin-center"
              />
              {/* Tooltip detail overlay inside pie chart */}
              {hoveredIdx === i && (
                <g>
                  {/* Backdrop rectangle at base of chart */}
                  <rect
                    x={cx - 130}
                    y={height - 40}
                    width="260"
                    height="28"
                    rx="4"
                    fill="#0A0A0B"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <text
                    x={cx}
                    y={height - 22}
                    textAnchor="middle"
                    className="font-sans text-[11px] fill-white text-white font-medium"
                  >
                    {d.name}: {d.value.toLocaleString()} ({ (percentage * 100).toFixed(1) }%)
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Compact color badges/legends to the right side */}
        <g transform="translate(15, 10)">
          {chartDataRaw.map((d, i) => {
            if (i > 5) return null; // display max 6 legends
            const percentage = total > 0 ? (d.value / total * 100).toFixed(1) : "0";
            return (
              <g key={`legend-${i}`} transform={`translate(${i % 2 === 0 ? 30 : 250}, ${Math.floor(i / 2) * 18})`}>
                <rect width="10" height="10" rx="2" fill={colors[i % colors.length]} />
                <text x="16" y="9" className="font-sans text-[10px] fill-white/40 font-medium">
                  {d.name} ({percentage}%)
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  const renderScatterPlot = () => {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {renderYAxisGridAndLabels()}
        {chartDataRaw.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const color = colors[i % colors.length];

          return (
            <g
              key={`scatter-dot-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={x}
                cy={y}
                r={hoveredIdx === i ? 10 : 7}
                fill={color}
                opacity={hoveredIdx === null || hoveredIdx === i ? 0.85 : 0.4}
                className="transition-all duration-200"
              />
              {hoveredIdx === i && (
                <g>
                  <rect
                    x={x - 60}
                    y={y - 35}
                    width="120"
                    height="24"
                    rx="4"
                    fill="#0A0A0B"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    className="font-sans text-[10px] text-white font-semibold fill-white"
                  >
                    {d.name}: {d.value.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {renderXAxisLabels()}
        {/* baseline */}
        <line
          x1={paddingLeft}
          y1={getY(0)}
          x2={width - paddingRight}
          y2={getY(0)}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  if (type === "dashboard") {
    return (
      <div className="bg-[#141417] border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
          <div className="p-2.5 bg-blue-600/10 rounded text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-white text-base leading-none">{title || "Active Dataset Dashboard Master"}</h3>
            <p className="font-sans text-xs text-white/40 mt-1.5">Auto-visualizing metric {yAxisKey} segmented across {xAxisKey}.</p>
          </div>
        </div>

        {/* Multi-Visualizer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Bar */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart className="w-4 h-4 text-blue-400" />
              <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/50">Bar Distribution</span>
            </div>
            <div className="h-56">
              <VisualChart type="bar" title="" data={data} xAxisKey={xAxisKey} yAxisKey={yAxisKey} colors={colors} />
            </div>
          </div>

          {/* Chart 2: Line */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart className="w-4 h-4 text-emerald-400 rotate-90" />
              <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/50">Trends Line</span>
            </div>
            <div className="h-56">
              <VisualChart type="line" title="" data={data} xAxisKey={xAxisKey} yAxisKey={yAxisKey} colors={colors} />
            </div>
          </div>

          {/* Chart 3: Pie */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart className="w-4 h-4 text-purple-400 rotate-180" />
              <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/50">Composition Pie</span>
            </div>
            <div className="h-56">
              <VisualChart type="pie" title="" data={data} xAxisKey={xAxisKey} yAxisKey={yAxisKey} colors={colors} />
            </div>
          </div>

          {/* Chart 4: Scatter Plot */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart className="w-4 h-4 text-orange-400" />
              <span className="font-sans text-[10px] uppercase tracking-wider font-bold text-white/50">Scatter Distribution</span>
            </div>
            <div className="h-56">
              <VisualChart type="scatter" title="" data={data} xAxisKey={xAxisKey} yAxisKey={yAxisKey} colors={colors} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent border border-white/5 rounded p-5 flex flex-col h-full">
      {title && (
        <div className="mb-4">
          <h4 className="font-sans font-semibold text-white/90 text-sm tracking-tight">{title}</h4>
          <span className="font-mono text-[10px] text-white/40 capitalize">Metric: {yAxisKey} by {xAxisKey}</span>
        </div>
      )}
      <div className="flex-1 min-h-[220px] flex items-center justify-center">
        {type === "bar" && renderBarChart()}
        {type === "line" && renderLineChart()}
        {type === "pie" && renderPieChart()}
        {type === "scatter" && renderScatterPlot()}
      </div>
    </div>
  );
}
