export interface Node {
  node_id: number;
  user_id: number;
  screen_name: string | null;
  cluster: number; // Can be -1 for unclustered
  causal_impact: number | null; // Key field for node sizing
  out_degree: number;
  in_degree: number;
  total_degree: number;
  degree_percentile: number;
  is_influencer: boolean;
  is_active: boolean;
  influence_score: number;
  cluster_cohesion: number;
  cluster_distance: number;
  intra_cluster_edges: number;
  inter_cluster_edges: number;
  // Properties added by force simulation (3D)
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

export interface Edge {
  source: number | Node; // Should be node_id
  target: number | Node; // Should be node_id
  edge_type: number; // 0=retweet, 1=reply, 2=mention
  edge_type_name: string;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    nodeCount: number;
    edgeCount: number;
    edgeTypes: Record<string, string>;
    clusterNames?: Record<string, string>;
  };
}
