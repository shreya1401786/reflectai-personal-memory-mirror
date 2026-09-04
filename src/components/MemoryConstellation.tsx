import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Sparkles, Compass, Circle, BookOpen, Layers } from "lucide-react";
import { JournalEntry } from "../types";

interface MemoryConstellationProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onNavigateToJournal: () => void;
}

interface NodeData extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "entry" | "tag" | "location";
  val: number;
  entryRef?: JournalEntry;
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  source: string | NodeData;
  target: string | NodeData;
}

export const MemoryConstellation: React.FC<MemoryConstellationProps> = ({
  entries,
  onSelectEntry,
  onNavigateToJournal,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || entries.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Build Graph Data
    const nodes: NodeData[] = [];
    const links: LinkData[] = [];
    const nodeMap = new Map<string, NodeData>();

    // 1. Add Entry Nodes
    entries.forEach((e) => {
      const node: NodeData = {
        id: `entry_${e.id}`,
        name: e.title || "Untitled",
        type: "entry",
        val: 12,
        entryRef: e,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // 2. Add Tag nodes & links
      (e.tags || []).forEach((tag) => {
        const tagId = `tag_${tag.toLowerCase()}`;
        if (!nodeMap.has(tagId)) {
          const tagNode: NodeData = {
            id: tagId,
            name: tag,
            type: "tag",
            val: 8,
          };
          nodes.push(tagNode);
          nodeMap.set(tagId, tagNode);
        } else {
          const existing = nodeMap.get(tagId)!;
          existing.val += 2;
        }

        links.push({
          source: node.id,
          target: tagId,
        });
      });

      // 3. Add Location nodes & links
      if (e.location?.name) {
        const locId = `loc_${e.location.name.toLowerCase()}`;
        if (!nodeMap.has(locId)) {
          const locNode: NodeData = {
            id: locId,
            name: e.location.name,
            type: "location",
            val: 10,
          };
          nodes.push(locNode);
          nodeMap.set(locId, locNode);
        }
        links.push({
          source: node.id,
          target: locId,
        });
      }
    });

    // Force Simulation
    const simulation = d3
      .forceSimulation<NodeData>(nodes)
      .force(
        "link",
        d3.forceLink<NodeData, LinkData>(links).id((d) => d.id).distance(55)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.val + 8));

    // Render Links
    const link = svg
      .append("g")
      .attr("stroke", "#E5E1D8")
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line");

    // Render Nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.val)
      .attr("fill", (d) => {
        if (d.type === "entry") return "#1A1A1A";
        if (d.type === "location") return "#D4A373";
        return "#777777";
      })
      .attr("stroke", "#FAF9F6")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (_event, d) => {
        setSelectedNode(d);
      });

    // Node Labels
    const labels = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("font-size", 9)
      .attr("font-family", "sans-serif")
      .attr("fill", "#4A4A4A")
      .attr("dx", 12)
      .attr("dy", 3)
      .text((d) => (d.name.length > 18 ? d.name.slice(0, 18) + "..." : d.name));

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d) => Math.max(15, Math.min(width - 15, d.x || 0)))
        .attr("cy", (d) => Math.max(15, Math.min(height - 15, d.y || 0)));

      labels
        .attr("x", (d) => d.x || 0)
        .attr("y", (d) => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [entries]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#FAF9F6] border border-[#E5E1D8] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4A373] font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>Topological Memory Graph</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] font-medium tracking-tight mt-2 italic">
            Memory Constellation
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#666] mt-2 max-w-2xl">
            A dynamic force-directed star map connecting your reflections, themes, and sanctuaries. Click any celestial node to explore interconnected thoughts.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 bg-white border border-[#E5E1D8] px-4 py-2 text-[10px] font-sans uppercase tracking-wider text-[#555]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
            <span>Reflections</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373]" />
            <span>Sanctuaries</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#777]" />
            <span>Themes</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          ref={containerRef}
          className="lg:col-span-2 bg-[#FAF9F6] border border-[#E5E1D8] p-2 overflow-hidden shadow-xs"
        >
          <svg ref={svgRef} className="w-full h-[480px]" />
        </div>

        {/* Selected Node Inspector */}
        <div className="bg-white border border-[#E5E1D8] p-6 space-y-4">
          <div className="pb-3 border-b border-[#EAE7DF] flex items-center justify-between">
            <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#1A1A1A]">
              Node Inspector
            </span>
            {selectedNode && (
              <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 bg-[#F4F1EA] text-[#1A1A1A] border border-[#E5E1D8]">
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">
                {selectedNode.name}
              </h3>

              {selectedNode.entryRef ? (
                <div className="space-y-3">
                  <span className="text-[10px] font-sans text-[#8C8C8C] block">
                    {new Date(selectedNode.entryRef.createdAt).toLocaleDateString()}
                  </span>
                  <p className="text-xs font-sans text-[#666] leading-relaxed line-clamp-4">
                    {selectedNode.entryRef.summary ||
                      selectedNode.entryRef.messages?.[0]?.content ||
                      "Empty reflection"}
                  </p>
                  <button
                    onClick={() => {
                      if (selectedNode.entryRef) {
                        onSelectEntry(selectedNode.entryRef);
                        onNavigateToJournal();
                      }
                    }}
                    className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Open Reflection in Journal
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-sans text-[#777] leading-relaxed">
                    This node anchors recurring thoughts under the keyword{" "}
                    <strong>"{selectedNode.name}"</strong> across your memory constellation.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <Layers className="w-8 h-8 text-[#A0A0A0] mx-auto stroke-1" />
              <p className="text-xs font-sans text-[#8C8C8C]">
                Click any node in the constellation to examine related memories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
