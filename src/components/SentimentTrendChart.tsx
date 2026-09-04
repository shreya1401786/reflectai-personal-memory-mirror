import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { JournalEntry } from "../types";
import { getEntrySentiment, SentimentAnalysisResult } from "../lib/sentiment";
import { TrendingUp, Smile, Compass, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

interface SentimentDataPoint {
  id: string;
  title: string;
  date: Date;
  dateString: string;
  score: number;
  label: string;
  valence: "positive" | "neutral" | "negative";
  snippet: string;
  tags: string[];
}

interface SentimentTrendChartProps {
  entries: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
  selectedEntryId?: string | null;
}

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  entries,
  onSelectEntry,
  selectedEntryId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<SentimentDataPoint | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Process and sort entries chronologically (oldest to newest for time progression)
  const dataPoints: SentimentDataPoint[] = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const validEntries = entries.filter((e) => e.createdAt || e.updatedAt);

    // Oldest to newest
    const sorted = [...validEntries].sort(
      (a, b) => new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime()
    );

    return sorted.map((entry) => {
      const sentiment = getEntrySentiment(entry);
      const dateObj = new Date(entry.createdAt || entry.updatedAt);
      const snippet =
        entry.summary ||
        (entry.messages.length > 0
          ? entry.messages[0].content.slice(0, 100) + (entry.messages[0].content.length > 100 ? "..." : "")
          : "Personal entry");

      return {
        id: entry.id,
        title: entry.title || "Untitled Reflection",
        date: dateObj,
        dateString: dateObj.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        score: sentiment.score,
        label: sentiment.label,
        valence: sentiment.valence,
        snippet,
        tags: entry.tags || [],
      };
    });
  }, [entries]);

  // Observe container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver((chartEntries) => {
      for (const entry of chartEntries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute aggregate metrics
  const stats = useMemo(() => {
    if (dataPoints.length === 0) {
      return { average: 0, tone: "Reflective", count: 0, trend: "Stable" };
    }

    const total = dataPoints.reduce((acc, curr) => acc + curr.score, 0);
    const avg = total / dataPoints.length;
    const roundedAvg = Math.round(avg * 100) / 100;

    let tone = "Reflective";
    if (roundedAvg >= 0.25) tone = "Optimistic";
    else if (roundedAvg >= 0.05) tone = "Serene";
    else if (roundedAvg >= -0.1) tone = "Contemplative";
    else tone = "Vulnerable";

    let trend = "Steady";
    if (dataPoints.length >= 2) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

      const avg1 = firstHalf.reduce((a, b) => a + b.score, 0) / (firstHalf.length || 1);
      const avg2 = secondHalf.reduce((a, b) => a + b.score, 0) / (secondHalf.length || 1);

      if (avg2 - avg1 > 0.15) trend = "Uplifting";
      else if (avg1 - avg2 > 0.15) trend = "Introspective";
    }

    return {
      average: roundedAvg,
      tone,
      count: dataPoints.length,
      trend,
    };
  }, [dataPoints]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || !isExpanded || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = Math.max(300, containerWidth);
    const height = 240;
    const margin = { top: 25, right: 35, bottom: 40, left: 45 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale
    let xScale: d3.ScaleTime<number, number> | d3.ScalePoint<string>;
    const usePointScale = dataPoints.length <= 1;

    const xDomainDates = d3.extent(dataPoints, (d) => d.date) as [Date, Date];
    const timeSpan = xDomainDates[1].getTime() - xDomainDates[0].getTime();

    // If all entries on same timestamp or single entry, expand domain
    const adjustedMin = new Date(xDomainDates[0].getTime() - (timeSpan === 0 ? 3600000 : timeSpan * 0.05));
    const adjustedMax = new Date(xDomainDates[1].getTime() + (timeSpan === 0 ? 3600000 : timeSpan * 0.05));

    const timeScale = d3
      .scaleTime()
      .domain([adjustedMin, adjustedMax])
      .range([0, innerWidth]);

    // Y Scale: Fixed continuous sentiment domain [-1.0, 1.0] with padding
    const yScale = d3.scaleLinear().domain([-1.0, 1.0]).range([innerHeight, 0]);

    // Background Neutral Baseline zone (score: -0.1 to 0.1)
    const neutralTop = yScale(0.1);
    const neutralBottom = yScale(-0.1);
    g.append("rect")
      .attr("x", 0)
      .attr("y", neutralTop)
      .attr("width", innerWidth)
      .attr("height", Math.max(1, neutralBottom - neutralTop))
      .attr("fill", "#F4F1EA")
      .attr("opacity", 0.6);

    // Zero / Equilibrium Line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#D5CFBF")
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-width", 1);

    // Gridlines Y
    const yTicks = [-0.8, -0.4, 0, 0.4, 0.8];
    g.selectAll(".grid-line-y")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#EBE7DF")
      .attr("stroke-width", 0.7);

    // Left Y Axis Labels
    const yLabels = [
      { val: 0.8, text: "+ Uplifted" },
      { val: 0.4, text: "Optimistic" },
      { val: 0.0, text: "Balanced" },
      { val: -0.4, text: "Tense" },
      { val: -0.8, text: "- Melancholic" },
    ];

    g.selectAll(".y-axis-label")
      .data(yLabels)
      .enter()
      .append("text")
      .attr("class", "y-axis-label")
      .attr("x", -10)
      .attr("y", (d) => yScale(d.val))
      .attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("fill", "#8C8C8C")
      .attr("font-size", "9px")
      .attr("font-family", "Plus Jakarta Sans, sans-serif")
      .attr("letter-spacing", "0.05em")
      .text((d) => d.text);

    // X Axis Ticks & Formatter
    const numXTicks = Math.max(2, Math.min(5, Math.floor(innerWidth / 110)));
    const xAxis = d3
      .axisBottom<Date>(timeScale)
      .ticks(numXTicks)
      .tickFormat(d3.timeFormat("%b %d") as any)
      .tickSize(4);

    const xAxisGroup = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select(".domain").attr("stroke", "#D5CFBF");
    xAxisGroup.selectAll(".tick line").attr("stroke", "#D5CFBF");
    xAxisGroup
      .selectAll(".tick text")
      .attr("fill", "#666666")
      .attr("font-size", "10px")
      .attr("font-family", "Plus Jakarta Sans, sans-serif")
      .attr("dy", "1em");

    // Area Generator (Gradient Fill under curve)
    const areaDef = svg.append("defs");
    const gradient = areaDef
      .append("linearGradient")
      .attr("id", "sentiment-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#D4A373").attr("stop-opacity", 0.25);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#D4A373").attr("stop-opacity", 0.0);

    if (dataPoints.length > 1) {
      const area = d3
        .area<SentimentDataPoint>()
        .x((d) => timeScale(d.date))
        .y0(yScale(0))
        .y1((d) => yScale(d.score))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(dataPoints)
        .attr("fill", "url(#sentiment-area-gradient)")
        .attr("d", area);

      // Line Generator
      const line = d3
        .line<SentimentDataPoint>()
        .x((d) => timeScale(d.date))
        .y((d) => yScale(d.score))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(dataPoints)
        .attr("fill", "none")
        .attr("stroke", "#1A1A1A")
        .attr("stroke-width", 2)
        .attr("d", line);
    }

    // Color mapper for node points
    const getNodeColor = (score: number) => {
      if (score >= 0.2) return "#4D7C0F"; // Olive/Sage Green
      if (score <= -0.2) return "#B91C1C"; // Crimson/Burgundy
      return "#D4A373"; // Warm ochre
    };

    // Data Nodes
    const nodes = g
      .selectAll(".sentiment-node")
      .data(dataPoints)
      .enter()
      .append("g")
      .attr("class", "sentiment-node")
      .attr("transform", (d) => `translate(${timeScale(d.date)},${yScale(d.score)})`)
      .style("cursor", "pointer")
      .on("mouseenter", (_event, d) => {
        setHoveredPoint(d);
      })
      .on("mouseleave", () => {
        setHoveredPoint(null);
      })
      .on("click", (_event, d) => {
        if (onSelectEntry) {
          const match = entries.find((e) => e.id === d.id);
          if (match) onSelectEntry(match);
        }
      });

    // Outer halo for selected point
    nodes
      .append("circle")
      .attr("r", (d) => (d.id === selectedEntryId ? 8 : 6))
      .attr("fill", (d) => (d.id === selectedEntryId ? "#1A1A1A" : "#FFFFFF"))
      .attr("stroke", (d) => getNodeColor(d.score))
      .attr("stroke-width", 2)
      .attr("opacity", 0.95);

    // Inner core dot
    nodes
      .append("circle")
      .attr("r", 3)
      .attr("fill", (d) => (d.id === selectedEntryId ? "#FFFFFF" : getNodeColor(d.score)));
  }, [dataPoints, containerWidth, isExpanded, selectedEntryId, entries, onSelectEntry]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      id="sentiment-trend-card"
      ref={containerRef}
      className="bg-white border border-[#E5E1D8] p-5 sm:p-6 mb-8 shadow-xs transition-all"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F4F1EA] border border-[#E5E1D8] flex items-center justify-center text-[#1A1A1A]">
            <TrendingUp className="w-4 h-4 text-[#D4A373]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold italic text-[#1A1A1A]">
                Emotional Tone & Sentiment Trend
              </h3>
              <span className="text-[9px] uppercase tracking-widest font-sans font-semibold bg-[#FAF9F6] border border-[#E5E1D8] px-2 py-0.5 text-[#666]">
                D3.js Visualization
              </span>
            </div>
            <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-[#8C8C8C] mt-0.5">
              Longitudinal tracking across {dataPoints.length} journal {dataPoints.length === 1 ? "reflection" : "reflections"}
            </p>
          </div>
        </div>

        {/* Aggregate metric chips */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] border border-[#E5E1D8] text-[11px] font-sans">
            <span className="text-[#8C8C8C] uppercase tracking-wider text-[9px]">Mean Tone:</span>
            <span
              className={`font-semibold ${
                stats.average >= 0.1
                  ? "text-[#4D7C0F]"
                  : stats.average <= -0.1
                  ? "text-[#B91C1C]"
                  : "text-[#1A1A1A]"
              }`}
            >
              {stats.tone} ({stats.average > 0 ? `+${stats.average}` : stats.average})
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#FAF9F6] border border-[#E5E1D8] text-[11px] font-sans">
            <span className="text-[#8C8C8C] uppercase tracking-wider text-[9px]">Momentum:</span>
            <span className="font-medium text-[#1A1A1A]">{stats.trend}</span>
          </div>

          <button
            id="btn-toggle-sentiment-chart"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 text-[#8C8C8C] hover:text-[#1A1A1A] hover:bg-[#F4F1EA] transition-colors cursor-pointer border border-[#E5E1D8]"
            title={isExpanded ? "Collapse chart" : "Expand chart"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Chart Body */}
      {isExpanded && (
        <div className="mt-4">
          {/* Main SVG Plot Canvas */}
          <div className="relative w-full overflow-hidden">
            <svg ref={svgRef} className="w-full overflow-visible" />

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-20 p-3 bg-white/95 border border-[#1A1A1A] shadow-md max-w-xs transition-opacity duration-150 text-left"
                style={{
                  top: "10px",
                  right: "16px",
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E1D8] pb-1.5 mb-1.5">
                  <span className="font-serif font-bold text-xs text-[#1A1A1A] truncate max-w-[170px]">
                    {hoveredPoint.title}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-wider font-sans font-semibold px-1.5 py-0.2 border ${
                      hoveredPoint.valence === "positive"
                        ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                        : hoveredPoint.valence === "negative"
                        ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
                        : "bg-[#F4F1EA] text-[#666] border-[#E5E1D8]"
                    }`}
                  >
                    {hoveredPoint.label}
                  </span>
                </div>

                <div className="text-[10px] text-[#8C8C8C] font-sans uppercase tracking-wider mb-1">
                  {hoveredPoint.dateString} • Score: {hoveredPoint.score > 0 ? `+${hoveredPoint.score}` : hoveredPoint.score}
                </div>

                <p className="text-xs font-serif italic text-[#444] line-clamp-2 leading-relaxed">
                  "{hoveredPoint.snippet}"
                </p>

                <div className="mt-2 text-[9px] font-sans text-[#A0A0A0] uppercase tracking-wider">
                  Click point to jump to entry
                </div>
              </div>
            )}
          </div>

          {/* Interactive Legend & Interpretation Footer */}
          <div className="mt-3 pt-3 border-t border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3 text-[11px] font-sans text-[#666]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4D7C0F]"></span>
                <span className="text-[#1A1A1A] font-medium">Uplifted / Optimistic (&gt; +0.2)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373]"></span>
                <span className="text-[#1A1A1A] font-medium">Balanced / Reflective (-0.2 to +0.2)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]"></span>
                <span className="text-[#1A1A1A] font-medium">Vulnerable / Tense (&lt; -0.2)</span>
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-widest text-[#8C8C8C]">
              Continuous scale [-1.0 ... +1.0] • Click dot to navigate
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
