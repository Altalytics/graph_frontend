import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { clusterColors } from '../utils/graphUtils';
import type { GraphData, Node } from '../types/graph';

interface Props {
  data: GraphData;
  onReset: () => void;
}

interface TooltipState {
  node: Node;
  x: number;
  y: number;
}

interface SimNode extends Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const SIDEBAR_WIDTH = 280;
const NODE_PANEL_WIDTH = 300;
const BG = '#07071a';
const GLASS = 'rgba(10, 10, 30, 0.85)';
const BORDER = 'rgba(255,255,255,0.08)';

const GraphVisualizationD3: React.FC<Props> = ({ data, onReset }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, any> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const communityLabels: Record<string, string> = data.metadata?.community_labels ?? {};

  const clusterStats = React.useMemo(() => {
    const stats: Record<string, { count: number; topImpact: number }> = {};
    data.nodes.forEach(n => {
      const k = String(n.cluster ?? -1);
      if (!stats[k]) stats[k] = { count: 0, topImpact: 0 };
      stats[k].count++;
      if ((n.causal_impact ?? 0) > stats[k].topImpact) stats[k].topImpact = n.causal_impact ?? 0;
    });
    return stats;
  }, [data.nodes]);

  const getRadius = useCallback((n: any): number => {
    const impact = n.causal_impact ?? 0;
    if (impact > 0) return 4 + Math.log1p(impact) * 4.5;
    return 3.5 + Math.log1p(n.total_degree ?? 0) * 0.4;
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    simRef.current?.stop();
    setSelectedNode(null);
    setSelectedCluster(null);

    const W = svgRef.current.clientWidth;
    const H = svgRef.current.clientHeight;

    // --- Deep copy nodes & edges ---
    const nodes: SimNode[] = data.nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
    const nodeById = new Map(nodes.map(n => [n.node_id, n]));

    const edges = data.edges
      .map(e => ({
        source: typeof e.source === 'number' ? e.source : (e.source as Node).node_id,
        target: typeof e.target === 'number' ? e.target : (e.target as Node).node_id,
        weight: e.weight,
      }))
      .filter(e => nodeById.has(e.source as number) && nodeById.has(e.target as number));

    // --- Cluster centers on a circle ---
    const clusterKeys = Object.keys(clusterStats).filter(k => k !== '-1').sort();
    const R = Math.min(W, H) * 0.3;
    const clusterCenters: Record<string, { x: number; y: number }> = { '-1': { x: W / 2, y: H / 2 } };
    clusterKeys.forEach((k, i) => {
      const angle = (2 * Math.PI * i) / clusterKeys.length - Math.PI / 2;
      clusterCenters[k] = { x: W / 2 + R * Math.cos(angle), y: H / 2 + R * Math.sin(angle) };
    });

    // Pre-position nodes near their cluster center
    nodes.forEach(n => {
      const c = clusterCenters[String(n.cluster)] ?? clusterCenters['-1'];
      n.x = c.x + (Math.random() - 0.5) * 60;
      n.y = c.y + (Math.random() - 0.5) * 60;
    });

    // --- SVG defs ---
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Subtle radial gradient background
    const grad = defs.append('radialGradient').attr('id', 'bg-grad').attr('cx', '50%').attr('cy', '50%').attr('r', '70%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#0d0d2b');
    grad.append('stop').attr('offset', '100%').attr('stop-color', BG);

    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#bg-grad)');

    // --- Graph root (zoom target) ---
    const root = svg.append('g');

    // --- Zoom ---
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', e => root.attr('transform', e.transform));

    svg.call(zoom).on('dblclick.zoom', null);

    // --- Links ---
    const linkSel = root.append('g')
      .selectAll<SVGLineElement, any>('line')
      .data(edges)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', (e: any) => Math.min(1.5, 0.4 + e.weight * 0.04));

    // --- Nodes ---
    const nodeSel = root.append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', getRadius)
      .attr('fill', n => clusterColors[String(n.cluster)] ?? clusterColors['-1'])
      .attr('stroke', 'rgba(255,255,255,0.25)')
      .attr('stroke-width', 0.6)
      .attr('filter', 'url(#glow)')
      .style('cursor', 'pointer');

    // --- Community labels ---
    const labelSel = root.append('g')
      .selectAll<SVGTextElement, string>('text')
      .data(clusterKeys)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'auto')
      .attr('fill', k => clusterColors[k] ?? '#fff')
      .attr('fill-opacity', 0.85)
      .attr('font-size', 12)
      .attr('font-weight', '700')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('letter-spacing', '0.5px')
      .attr('pointer-events', 'none')
      .text(k => communityLabels[k] ?? `Community ${k}`);

    // --- Simulation ---
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, any>(edges).id(n => n.node_id).distance(40).strength(0.2))
      .force('charge', d3.forceManyBody<SimNode>().strength(-90))
      .force('collide', d3.forceCollide<SimNode>().radius(n => getRadius(n) + 3).strength(0.7))
      .force('cluster', (alpha: number) => {
        nodes.forEach(n => {
          const c = clusterCenters[String(n.cluster)] ?? clusterCenters['-1'];
          n.vx += (c.x - n.x) * alpha * 0.35;
          n.vy += (c.y - n.y) * alpha * 0.35;
        });
      })
      .alphaDecay(0.02);

    simRef.current = sim;

    sim.on('tick', () => {
      linkSel
        .attr('x1', (e: any) => e.source.x)
        .attr('y1', (e: any) => e.source.y)
        .attr('x2', (e: any) => e.target.x)
        .attr('y2', (e: any) => e.target.y);

      nodeSel
        .attr('cx', n => n.x)
        .attr('cy', n => n.y);

      // Community labels: centroid of cluster nodes, shifted up
      labelSel
        .attr('x', k => {
          const members = nodes.filter(n => String(n.cluster) === k);
          return members.length ? d3.mean(members, n => n.x)! : clusterCenters[k].x;
        })
        .attr('y', k => {
          const members = nodes.filter(n => String(n.cluster) === k);
          const cy = members.length ? d3.mean(members, n => n.y)! : clusterCenters[k].y;
          const maxR = d3.max(members, n => getRadius(n)) ?? 10;
          return cy - maxR - 10;
        });
    });

    // --- Node interactions ---
    nodeSel
      .on('mouseover', (event, n) => {
        d3.select(event.currentTarget).attr('stroke', 'white').attr('stroke-width', 2);
      })
      .on('mousemove', (event, n) => {
        setTooltip({ node: n, x: event.clientX, y: event.clientY });
      })
      .on('mouseout', (event, n) => {
        d3.select(event.currentTarget).attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 0.6);
        setTooltip(null);
      })
      .on('click', (event, n) => {
        event.stopPropagation();
        setSelectedNode(prev => (prev?.node_id === n.node_id ? null : n));
      });

    svg.on('click', () => setSelectedNode(null));

    // Initial zoom to fit after layout settles
    const fitZoom = () => {
      if (!svgRef.current) return;
      const xs = nodes.map(n => n.x);
      const ys = nodes.map(n => n.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = 80;
      const scale = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0), 2);
      const tx = W / 2 - scale * ((x0 + x1) / 2);
      const ty = H / 2 - scale * ((y0 + y1) / 2);
      svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    setTimeout(fitZoom, 2500);

    return () => { sim.stop(); };
  }, [data]);

  // Apply cluster dimming without restarting simulation
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, SimNode>('circle')
      .attr('opacity', n =>
        selectedCluster === null || String(n.cluster) === selectedCluster ? 1 : 0.1
      );
    d3.select(svgRef.current)
      .selectAll<SVGLineElement, any>('line')
      .attr('opacity', selectedCluster === null ? 1 : 0.05);
  }, [selectedCluster]);

  // Highlight selected node
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, SimNode>('circle')
      .attr('stroke', n => selectedNode?.node_id === n.node_id ? 'white' : 'rgba(255,255,255,0.25)')
      .attr('stroke-width', n => selectedNode?.node_id === n.node_id ? 2.5 : 0.6);
  }, [selectedNode]);

  const handleClusterClick = (k: string) => {
    setSelectedCluster(prev => (prev === k ? null : k));
    setSelectedNode(null);
  };

  const nonZeroImpact = data.nodes.filter(n => (n.causal_impact ?? 0) > 0).length;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: BG, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Full-screen SVG */}
      <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* ── Left sidebar ── */}
      <div style={{
        position: 'absolute', top: 20, left: 20, width: SIDEBAR_WIDTH,
        background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12,
        backdropFilter: 'blur(12px)', padding: '20px', color: 'white',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.3px' }}>
          Network Analysis
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
          Causal influence graph
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Accounts', value: data.nodes.length },
            { label: 'Connections', value: data.edges.length },
            { label: 'Communities', value: Object.keys(clusterStats).filter(k => k !== '-1').length },
            { label: 'Influencers', value: nonZeroImpact },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
          Communities
        </div>

        {Object.entries(clusterStats)
          .filter(([k]) => k !== '-1')
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([k, stats]) => (
            <div
              key={k}
              onClick={() => handleClusterClick(k)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                background: selectedCluster === k ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${selectedCluster === k ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (selectedCluster !== k) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (selectedCluster !== k) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: clusterColors[k] ?? '#cacaca',
                boxShadow: `0 0 6px ${clusterColors[k] ?? '#cacaca'}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {communityLabels[k] ?? `Community ${k}`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {stats.count} accounts
                </div>
              </div>
            </div>
          ))}

        {selectedCluster && (
          <button
            onClick={() => setSelectedCluster(null)}
            style={{
              width: '100%', marginTop: 8, padding: '8px',
              background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
              borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
            }}
          >
            Clear filter
          </button>
        )}

        <button
          onClick={onReset}
          style={{
            width: '100%', marginTop: 16, padding: '10px',
            background: 'transparent', border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Upload new file
        </button>
      </div>

      {/* ── Selected node panel ── */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: NODE_PANEL_WIDTH,
        height: '100%', background: GLASS, borderLeft: `1px solid ${BORDER}`,
        backdropFilter: 'blur(12px)', padding: '28px 20px', color: 'white',
        transform: selectedNode ? 'translateX(0)' : `translateX(${NODE_PANEL_WIDTH}px)`,
        transition: 'transform 0.25s ease',
        overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        {selectedNode && (() => {
          const clusterKey = String(selectedNode.cluster ?? -1);
          const label = clusterKey === '-1' ? 'Unclustered' : (communityLabels[clusterKey] ?? `Community ${clusterKey}`);
          const color = clusterColors[clusterKey] ?? clusterColors['-1'];
          return (
            <>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Selected account</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, wordBreak: 'break-all' }}>
                @{selectedNode.screen_name ?? selectedNode.user_id}
              </div>

              {/* Community badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 20,
                background: `${color}22`, border: `1px solid ${color}55`, marginBottom: 20,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 12, color: color, fontWeight: 600 }}>{label}</span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { label: 'Causal Impact', value: (selectedNode.causal_impact ?? 0).toFixed(3) },
                  { label: 'Total Degree', value: selectedNode.total_degree },
                  { label: 'In-Degree', value: selectedNode.in_degree },
                  { label: 'Out-Degree', value: selectedNode.out_degree },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                    padding: '10px', border: `1px solid ${BORDER}`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                {[
                  { label: 'Influence Score', value: (selectedNode.influence_score ?? 0).toFixed(2), desc: 'in / out degree ratio' },
                  { label: 'Degree Percentile', value: `${(selectedNode.degree_percentile ?? 0).toFixed(0)}%`, desc: 'relative connectivity' },
                  { label: 'Cluster Cohesion', value: `${((selectedNode.cluster_cohesion ?? 0) * 100).toFixed(1)}%`, desc: 'within-community edges' },
                ].map(({ label, value, desc }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {selectedNode.is_influencer && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: '#e74c3c22', color: '#e74c3c', border: '1px solid #e74c3c55' }}>
                    INFLUENCER
                  </span>
                )}
                {selectedNode.is_active && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: '#2ecc7122', color: '#2ecc71', border: '1px solid #2ecc7155' }}>
                    ACTIVE
                  </span>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 14,
          background: 'rgba(7,7,26,0.95)', border: `1px solid ${BORDER}`,
          borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13,
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transform: 'translateY(-100%)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            @{tooltip.node.screen_name ?? tooltip.node.user_id}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>
            {communityLabels[String(tooltip.node.cluster)] ?? `Community ${tooltip.node.cluster}`}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', gap: 12 }}>
            <span>Impact: {(tooltip.node.causal_impact ?? 0).toFixed(3)}</span>
            <span>Degree: {tooltip.node.total_degree}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualizationD3;
