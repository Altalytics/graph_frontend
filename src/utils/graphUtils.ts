// Utility functions for graph data processing
import type { GraphData, Node } from '../types/graph';

// Color palette for pre-computed communities (0-3 from CSV, -1 for unclustered)
export const clusterColors: Record<string, string> = {
  '0': '#9467bd',    // Community 0 (Purple)
  '1': '#2ca02c',    // Community 1 (Green)
  '2': '#ff7f0e',    // Community 2 (Orange)
  '3': '#1f77b4',    // Community 3 (Blue)
  '4': '#8c564b',    // Community 4 (Brown/Tan) - if needed
  '5': '#e377c2',    // Community 5 (Pink) - if needed
  '6': '#7f7f7f',    // Community 6 (Grey) - if needed
  '7': '#bcbd22',    // Community 7 (Olive Green) - if needed
  '8': '#17becf',    // Community 8 (Cyan) - if needed
  '-1': '#cacacaff'    // Unclustered/background nodes (Dark Grey)
};

// Color mapping for edge types
export const edgeTypeColors: Record<number, string> = {
  0: 'rgba(255, 255, 255, 0.5)',  // Retweet (White)
  1: 'rgba(173, 216, 230, 0.7)',  // Reply (Light Blue)
  2: 'rgba(255, 165, 0, 0.7)',    // Mention (Orange)
};

export const edgeTypeLabels: Record<number, string> = {
  0: 'Retweet',
  1: 'Reply',
  2: 'Mention',
};

export const getClusterDisplayName = (clusterId: string | number, metadata?: GraphData['metadata']): string => {
  const clusterKey = String(clusterId);
  const customName = metadata?.clusterNames?.[clusterKey]?.trim();

  if (customName) {
    return customName;
  }

  return clusterKey === '-1' ? 'Unclustered' : `Community ${clusterKey}`;
};

interface ClusterStats {
  count: number;
  totalDegree: number;
  avgDegree: number;
  avgCohesion: number;
  influencers: number;
}

// Get node color based on pre-assigned cluster from CSV
// Clusters 0-3 are from pagerank_community columns in the CSV
// Cluster -1 indicates unclustered (no match in CSV or no pagerank score)
export const getNodeColor = (node: Node, selectedCluster: string | null = null): string => {
  const clusterKey = String(node.cluster ?? -1);
  
  // Dim non-selected clusters when a specific cluster is selected
  if (selectedCluster !== null && clusterKey !== String(selectedCluster)) {
    return 'rgba(200, 200, 200, 0.2)';
  }
  
  // Use the pre-defined color palette, defaulting to unclustered color
  return clusterColors[clusterKey] || clusterColors['-1'];
};

// Calculate node size based on causal_impact, with total_degree as fallback
export const getNodeSize = (node: Node): number => {
  const BASE_SIZE = 8; // Minimum size for nodes
  const CAUSAL_IMPACT_SCALING = 10; // Controls how much larger impactful nodes get
  const DEGREE_SCALING = 0.5; // Use a smaller factor for degree fallback
  
  const impact = node.causal_impact;
  
  // Prioritize causal_impact if it's a valid, positive number
  if (impact && impact > 0) {
    // Math.log1p is log(1 + x), which gracefully handles impact = 0
    return BASE_SIZE + Math.log1p(impact) * CAUSAL_IMPACT_SCALING;
  }
  
  // Fallback to total_degree if causal_impact is null, 0, or undefined
  const degree = node.total_degree || 0;
  return BASE_SIZE + Math.log1p(degree) * DEGREE_SCALING;
};

// Calculate statistics for each cluster
export const getClusterStats = (nodes: Node[]): Record<string, ClusterStats> => {
  const stats: Record<string, ClusterStats> = {};
  
  nodes.forEach(node => {
    const clusterKey = String(node.cluster ?? -1);
    if (!stats[clusterKey]) {
      stats[clusterKey] = {
        count: 0,
        totalDegree: 0,
        avgDegree: 0,
        avgCohesion: 0,
        influencers: 0
      };
    }
    
    stats[clusterKey].count++;
    stats[clusterKey].totalDegree += node.total_degree || 0;
    stats[clusterKey].avgCohesion += node.cluster_cohesion || 0;
    if (node.is_influencer) stats[clusterKey].influencers++;
  });
  
  // Calculate averages
  for (const clusterKey in stats) {
    const cluster = stats[clusterKey];
    if (cluster.count > 0) {
      cluster.avgDegree = cluster.totalDegree / cluster.count;
      cluster.avgCohesion = cluster.avgCohesion / cluster.count;
    }
  }
  
  return stats;
};

// Helper functions for formatting numbers
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num?.toString() ?? '0';
};

export const formatPercent = (value: number): string => {
  if (typeof value !== 'number') return '0.0%';
  return (value * 100).toFixed(1) + '%';
};
