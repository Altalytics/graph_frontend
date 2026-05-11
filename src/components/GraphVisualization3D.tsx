import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import InfoPanel from './InfoPanel';
import Controls from './Controls';
import { getNodeSize, getClusterStats, edgeTypeColors, clusterColors } from '../utils/graphUtils';
import type { GraphData, Node, Edge } from '../types/graph';

interface GraphVisualizationProps {
  data: GraphData;
}

/**
 * OPTIMIZED VERSION - CRASH-FREE IMPLEMENTATION
 * 
 * Key fixes applied:
 * - ✅ Completely eliminated crashes/freezes on node clicks and background clicks
 *   → Removed ALL visual changes on node click (no zooming, no highlighting, no dimming/hiding nodes or links)
 *   → Node click now ONLY updates the InfoPanel with the selected node's details
 *   → Background click ONLY clears the selected node (keeps cluster selection and edge filters intact)
 * - ✅ Removed neighbor/link highlighting logic entirely (no heavy link looping on clicks)
 * - ✅ Removed all camera movements on clicks (no cameraPosition, no zoomToFit on click)
 * - ✅ Kept initial zoomToFit on data load (instant, duration 0) for good starting view
 * - ✅ Fixed cluster dimming to work correctly with proper opacity handling
 * - ✅ Links and nodes always fully visible (no dynamic dimming except for cluster selection)
 * - ✅ Physics keeps running continuously, no pauses
 * 
 * Performance optimizations:
 * - ✅ Removed link particle animations
 * - ✅ Reusable geometry and materials (huge performance gain)
 * - ✅ No deep copying (faster filtering)
 * - ✅ Lower poly spheres (16 segments vs 32)
 */
const GraphVisualization3D: React.FC<GraphVisualizationProps> = ({ data }) => {
  const communityLabels = data.metadata?.community_labels ?? {};
  const fgRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
  });

  const clusterStats = useMemo(() => getClusterStats(data.nodes), [data.nodes]);

  const filteredData = useMemo(() => ({
    nodes: data.nodes,
    links: data.edges.filter((edge: Edge) => edgeTypeFilter[edge.edge_type]),
  }), [data, edgeTypeFilter]);

  // Reusable geometries
  const nodeGeometries = useMemo(() => {
    const sizes = [8, 12, 16, 20, 25];
    return sizes.map(size => new THREE.SphereGeometry(size, 16, 10));
  }, []);

  // Material caching
  const materialCache = useRef<Map<string, THREE.MeshLambertMaterial>>(new Map());

  const getMaterial = useCallback((color: string, opacity: number) => {
    const key = `${color}-${opacity}`;
    if (!materialCache.current.has(key)) {
      materialCache.current.set(key, new THREE.MeshLambertMaterial({
        color: color,
        transparent: opacity < 1,
        opacity: opacity,
        emissive: color,
        emissiveIntensity: 0.3
      }));
    }
    return materialCache.current.get(key)!;
  }, []);

  // Updated getNodeColor - always returns solid hex color (no alpha in string)
  // Cluster dimming now handled via opacity in nodeThreeObject
  const getNodeColorLocal = useCallback((node: Node, selectedCluster: string | null = null): string => {
    const clusterKey = String(node.cluster ?? -1);
    if (selectedCluster !== null && clusterKey !== String(selectedCluster)) {
      return '#999999'; // Grey base color for dimmed clusters
    }
    return clusterColors[clusterKey] || '#cacaca'; // Unclustered = light grey
  }, []);

  // Clustering force
  useEffect(() => {
    if (!fgRef.current) return;

    const timer = setTimeout(() => {
      if (!fgRef.current) return;

      try {
        const clusterCount = Object.keys(clusterStats).filter(k => k !== '-1').length;
        const clusterCenters: Record<string, {x: number, y: number, z: number}> = {};
        const RADIUS = 600;

        Object.keys(clusterStats).forEach((clusterKey, i) => {
          if (clusterKey === '-1') {
            clusterCenters[clusterKey] = { x: 0, y: 0, z: 0 };
            return;
          }

          const phi = Math.acos(-1 + (2 * i) / clusterCount);
          const theta = Math.sqrt(clusterCount * Math.PI) * phi;

          clusterCenters[clusterKey] = {
            x: RADIUS * Math.cos(theta) * Math.sin(phi),
            y: RADIUS * Math.sin(theta) * Math.sin(phi),
            z: RADIUS * Math.cos(phi)
          };
        });

        fgRef.current.d3Force('cluster', (alpha: number) => {
          const strength = 0.3 * alpha;

          filteredData.nodes.forEach((node: any) => {
            if (!node || node.x === undefined || node.vx === undefined) return;

            const clusterKey = String(node.cluster ?? -1);
            const center = clusterCenters[clusterKey];
            
            if (center) {
              node.vx += (center.x - node.x) * strength;
              node.vy += (center.y - node.y) * strength;
              node.vz += (center.z - node.z) * strength;
            }
          });
        });

        fgRef.current.d3Force('charge').strength(-120);
        fgRef.current.d3Force('link').distance(50);

        fgRef.current.d3ReheatSimulation();
      } catch (error) {
        console.warn('Failed to apply custom clustering force:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [filteredData, clusterStats]);

  // Initial view on data load - instant fit, no animation pause
  useEffect(() => {
    handleReset(); // Resets selections and edge filters for fresh data
    if (fgRef.current) {
      fgRef.current.zoomToFit(0, 100); // Instant, with padding
      fgRef.current.resumeAnimation();
    }
  }, [data]);

  // Node click: ONLY select node for InfoPanel - no visual changes, no zoom
  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  // Background click: ONLY clear selected node - keeps cluster/edge filters
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleClusterSelect = useCallback((cluster: string | null) => {
    setSelectedCluster(cluster);
    setSelectedNode(null); // Clear node when selecting cluster
  }, []);

  const handleReset = useCallback(() => {
    setSelectedCluster(null);
    setSelectedNode(null);
    setEdgeTypeFilter({ 0: true, 1: true, 2: true });
  }, []);

  const handleEdgeTypeFilterChange = useCallback((type: number, checked: boolean) => {
    setEdgeTypeFilter(prev => ({ ...prev, [type]: checked }));
  }, []);

  // Node rendering - proper opacity handling for cluster dimming only
  const nodeThreeObjectMemo = useCallback((node: any) => {
    const size = getNodeSize(node);
    const color = getNodeColorLocal(node, selectedCluster);

    // Opacity: full unless cluster-selected and node is in another cluster
    let opacity = 1;
    if (selectedCluster !== null) {
      const clusterKey = String(node.cluster ?? -1);
      if (clusterKey !== String(selectedCluster)) {
        opacity = 0.2; // Dim non-selected clusters
      }
    }

    let geometry;
    if (size < 10) geometry = nodeGeometries[0];
    else if (size < 14) geometry = nodeGeometries[1];
    else if (size < 18) geometry = nodeGeometries[2];
    else if (size < 23) geometry = nodeGeometries[3];
    else geometry = nodeGeometries[4];

    const material = getMaterial(color, opacity);
    return new THREE.Mesh(geometry, material);
  }, [selectedCluster, nodeGeometries, getMaterial, getNodeColorLocal]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#000011' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={filteredData as any}
        backgroundColor="#000011"
        nodeId="node_id"
        linkSource="source"
        linkTarget="target"
        
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
        warmupTicks={100}
        
        nodeThreeObject={nodeThreeObjectMemo}
        nodeLabel={node => {
          const clusterKey = String(node.cluster ?? -1);
          const label = clusterKey === '-1' ? 'Unclustered' : (communityLabels[clusterKey] || `Community ${clusterKey}`);
          return `<div style="color: #333; background: rgba(255,255,255,0.9); padding: 6px 8px; border-radius: 4px; font-size: 13px; line-height: 1.5;">
            <strong>${node.screen_name || node.user_id}</strong><br/>
            <span style="color: #666; font-size: 11px;">${label}</span><br/>
            Impact: ${(node.causal_impact || 0).toFixed(4)} &nbsp;•&nbsp; Degree: ${node.total_degree}
          </div>`;
        }}
        onNodeClick={handleNodeClick as any}
        onBackgroundClick={handleBackgroundClick}
        
        // Links always visible (no dynamic highlighting/dimming)
        linkColor={(link: any) => edgeTypeColors[link.edge_type]}
        linkWidth={0.4} // Constant width for clean look
        linkDirectionalParticles={0}
        linkDirectionalParticleWidth={0}
        
        enableNodeDrag={false}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      <InfoPanel
        data={data}
        selectedNode={selectedNode}
        selectedCluster={selectedCluster}
        clusterStats={clusterStats}
        onClusterSelect={handleClusterSelect}
      />

      <Controls
        fgRef={fgRef}
        onReset={handleReset}
        edgeTypeFilter={edgeTypeFilter}
        onEdgeTypeFilterChange={handleEdgeTypeFilterChange}
        showLabels={false}
        onShowLabelsChange={() => {}}
        is3D={true}
      />
    </div>
  );
};

export default GraphVisualization3D;
