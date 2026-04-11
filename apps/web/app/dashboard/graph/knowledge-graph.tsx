"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge, GraphData } from "@/lib/types";
import { FileTypeFilter } from "./file-type-filter";
import { SimilaritySlider } from "./similarity-slider";
import { DetailPanel } from "./detail-panel";
import Link from "next/link";

const NODE_COLORS: Record<string, string> = {
  pdf: "#3b82f6",
  md: "#a855f7",
  txt: "#14b8a6",
  docx: "#f59e0b",
  csv: "#22c55e",
};

function nodeRadius(chunkCount: number): number {
  return Math.max(8, Math.sqrt(chunkCount) * 5);
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function KnowledgeGraph() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [threshold, setThreshold] = useState(0.65);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Fetch graph data on mount
  useEffect(() => {
    fetch("/api/documents/graph")
      .then((res) => res.json())
      .then((data: GraphData) => {
        setGraphData(data);
        // Init active types from data
        const types = new Set(data.nodes.map((n) => n.file_type));
        setActiveTypes(types);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // D3 rendering
  const renderGraph = useCallback(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Filter nodes by active file types
    const filteredNodes = graphData.nodes.filter((n) =>
      activeTypes.has(n.file_type)
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter edges by threshold and active nodes
    const filteredEdges = graphData.edges.filter(
      (e) =>
        e.similarity >= threshold &&
        nodeIds.has(e.source as string) &&
        nodeIds.has(e.target as string)
    );

    // Clear previous
    svg.selectAll("*").remove();

    if (filteredNodes.length === 0) return;

    // Zoom
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Deep copy nodes/edges for D3 mutation
    const nodes: GraphNode[] = filteredNodes.map((n) => ({ ...n }));
    const edges: (GraphEdge & { source: GraphNode; target: GraphNode })[] =
      filteredEdges.map((e) => ({ ...e })) as never;

    // Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => 1 + (d.similarity - 0.5) * 6)
      .on("mouseenter", (event, d) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY - 10 + "px";
          tooltipRef.current.textContent = `Similarity: ${(d.similarity * 100).toFixed(1)}%`;
        }
      })
      .on("mouseleave", () => {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

    // Nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => nodeRadius(d.chunk_count))
      .attr("fill", (d) => NODE_COLORS[d.file_type] || "#6b7280")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("click", (_, d) => setSelectedNode(d));

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => truncate(d.name, 20))
      .attr("font-size", 11)
      .attr("fill", "#374151")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d.chunk_count) + 14)
      .attr("pointer-events", "none");

    // Drag
    const drag = d3
      .drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag as never);

    // Simulation
    if (simulationRef.current) simulationRef.current.stop();

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GraphNode>((d) => nodeRadius(d.chunk_count) + 5))
      .on("tick", () => {
        link
          .attr("x1", (d) => (d.source as GraphNode).x!)
          .attr("y1", (d) => (d.source as GraphNode).y!)
          .attr("x2", (d) => (d.target as GraphNode).x!)
          .attr("y2", (d) => (d.target as GraphNode).y!);
        node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
        label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
      });

    simulationRef.current = simulation;
  }, [graphData, threshold, activeTypes]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  // Re-render on window resize
  useEffect(() => {
    const handleResize = () => renderGraph();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderGraph]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] -m-6">
        <p className="text-muted-foreground">Loading knowledge graph...</p>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] -m-6">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No indexed documents</p>
          <p className="text-sm mt-1">
            <Link href="/dashboard" className="text-primary underline">
              Upload documents
            </Link>{" "}
            to see your knowledge graph
          </p>
        </div>
      </div>
    );
  }

  const allTypes = Array.from(new Set(graphData.nodes.map((n) => n.file_type)));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="border-b px-4 py-3 flex items-center gap-6 flex-wrap">
          <FileTypeFilter
            types={allTypes}
            activeTypes={activeTypes}
            colors={NODE_COLORS}
            onChange={setActiveTypes}
          />
          <SimilaritySlider value={threshold} onChange={setThreshold} />
          <span className="text-xs text-muted-foreground">
            {graphData.nodes.length} docs, {graphData.edges.filter((e) => e.similarity >= threshold).length} connections
          </span>
        </div>

        {/* Graph */}
        <div ref={containerRef} className="flex-1 relative bg-muted/20">
          <svg ref={svgRef} className="w-full h-full" />
          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="fixed hidden bg-foreground text-background text-xs px-2 py-1 rounded pointer-events-none z-50"
          />
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          edges={graphData.edges}
          nodes={graphData.nodes}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
