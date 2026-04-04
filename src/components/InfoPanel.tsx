import React from 'react';
import { clusterColors, formatNumber, formatPercent, getClusterDisplayName } from '../utils/graphUtils';
import type { GraphData, Node } from '../types/graph';

interface ClusterStats {
  count: number;
  avgDegree: number;
  avgCohesion: number;
  influencers: number;
}

interface InfoPanelProps {
  data: GraphData;
  selectedNode: Node | null;
  selectedCluster: string | null;
  clusterStats: Record<string, ClusterStats>;
  onClusterSelect: (cluster: string | null) => void; // Allow deselecting by passing null
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  data, 
  selectedNode, 
  selectedCluster, 
  clusterStats, 
  onClusterSelect 
}) => {
  // Calculate data quality metrics
  const nodesWithCausalImpact = data.nodes.filter(
    node => node.causal_impact !== null && node.causal_impact !== undefined && node.causal_impact > 0
  ).length;
  const causalImpactCoverage = ((nodesWithCausalImpact / data.nodes.length) * 100).toFixed(1);
  
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: '320px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      fontSize: '14px',
      zIndex: 10,
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>
        Network Analysis
      </h3>
      
      {/* Overall Graph Statistics */}
      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #ddd' }}>
        <MetricRow label="Total Nodes" value={formatNumber(data.nodes.length)} />
        <MetricRow label="Total Edges" value={formatNumber(data.edges.length)} />
        <MetricRow label="Communities" value={Object.keys(clusterStats).length} />
        <MetricRow 
          label="Causal Impact Data" 
          value={`${causalImpactCoverage}%`}
          description={`${nodesWithCausalImpact} of ${data.nodes.length} nodes have valid causal impact values`}
        />
      </div>
      
      {/* Cluster Selection Panel */}
      <div style={{ marginBottom: '15px' }}>
        <strong style={{ display: 'block', marginBottom: '10px' }}>
          Communities (click to filter)
        </strong>
        {Object.entries(clusterStats)
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([clusterKey, stats]) => (
            <div 
              key={clusterKey}
              onClick={() => onClusterSelect(selectedCluster === clusterKey ? null : clusterKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '8px 0',
                padding: '10px',
                background: selectedCluster === clusterKey ? '#e9ecef' : 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                border: selectedCluster === clusterKey ? '2px solid #343a40' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (selectedCluster !== clusterKey) {
                  e.currentTarget.style.background = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCluster !== clusterKey) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: clusterColors[clusterKey] || clusterColors['-1'],
                marginRight: '10px',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  {getClusterDisplayName(clusterKey, data.metadata)}
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {stats.count} nodes • Avg degree: {stats.avgDegree.toFixed(1)}
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  Cohesion: {formatPercent(stats.avgCohesion)} • {stats.influencers} influencers
                </div>
              </div>
            </div>
          ))}
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && (
        <div style={{ 
          marginTop: '15px', 
          paddingTop: '15px', 
          borderTop: '2px solid #ddd',
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: '6px'
        }}>
          <strong style={{ display: 'block', marginBottom: '10px', fontSize: '15px' }}>
            Selected Node
          </strong>
          
          {selectedNode.screen_name ?
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Account Name</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {selectedNode.screen_name}
              </div>
            </div> :
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>User ID</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {selectedNode.user_id}
              </div>
            </div>
          }
          
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Cluster</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: clusterColors[String(selectedNode.cluster ?? -1)] || clusterColors['-1'],
                marginRight: '6px',
              }} />
              <span style={{ fontSize: '13px' }}>
                {getClusterDisplayName(selectedNode.cluster ?? -1, data.metadata)}
              </span>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
            marginTop: '12px'
          }}>
            <MetricBox label="Total Degree" value={selectedNode.total_degree} />
            <MetricBox label="Out Degree" value={selectedNode.out_degree} />
            <MetricBox label="In Degree" value={selectedNode.in_degree} />
            <MetricBox label="Percentile" value={selectedNode.degree_percentile.toFixed(0) + '%'} />
          </div>
          
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
              Cluster Metrics
            </strong>
            <MetricRow 
              label="Cohesion" 
              value={formatPercent(selectedNode.cluster_cohesion ?? 0)}
              description="% of connections within cluster"
            />
            <MetricRow 
              label="Distance" 
              value={formatPercent(selectedNode.cluster_distance ?? 0)}
              description="Distance from cluster center"
            />
            <MetricRow 
              label="Intra-cluster" 
              value={selectedNode.intra_cluster_edges ?? 0}
              description="Connections within cluster"
            />
            <MetricRow 
              label="Inter-cluster" 
              value={selectedNode.inter_cluster_edges ?? 0}
              description="Connections to other clusters"
            />
          </div>
          
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
              Influence
            </strong>
            <MetricRow 
              label="Causal Impact" 
              value={
                selectedNode.causal_impact !== null && selectedNode.causal_impact !== undefined
                  ? selectedNode.causal_impact.toFixed(4)
                  : 'N/A (using degree)'
              }
              description="Used for node sizing (falls back to degree if missing)"
            />
            <MetricRow 
              label="Influence Score" 
              value={selectedNode.influence_score.toFixed(2)}
              description="Ratio of in/out degree"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {selectedNode.is_influencer && (
                <Badge color="#e74c3c" text="Influencer" />
              )}
              {selectedNode.is_active && (
                <Badge color="#2ecc71" text="Active" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const MetricBox: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div style={{
    background: 'white',
    padding: '8px',
    borderRadius: '4px',
    textAlign: 'center',
    border: '1px solid #e0e0e0'
  }}>
    <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{value}</div>
  </div>
);

const MetricRow: React.FC<{ label: string; value: string | number; description?: string }> = ({ label, value, description }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
      <span style={{ fontSize: '12px', color: '#495057' }}>{label}</span>
      <strong style={{ fontSize: '12px' }}>{value}</strong>
    </div>
    {description && (
      <div style={{ fontSize: '10px', color: '#adb5bd', fontStyle: 'italic' }}>
        {description}
      </div>
    )}
  </div>
);

const Badge: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span style={{
    display: 'inline-block',
    padding: '4px 10px',
    background: color,
    color: 'white',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }}>
    {text}
  </span>
);

export default InfoPanel;
