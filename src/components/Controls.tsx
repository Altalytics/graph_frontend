import React from 'react';
import { edgeTypeColors, edgeTypeLabels } from '../utils/graphUtils';

interface ControlsProps {
  fgRef: React.RefObject<any>;
  onReset: () => void;
  edgeTypeFilter: Record<number, boolean>;
  onEdgeTypeFilterChange: (type: number, checked: boolean) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  is3D?: boolean; // NEW PROP
}

const Controls: React.FC<ControlsProps> = ({ 
  fgRef, 
  onReset, 
  edgeTypeFilter, 
  onEdgeTypeFilterChange,
  showLabels,
  onShowLabelsChange,
  is3D = false // Default to false
}) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      right: 10,
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      minWidth: '200px',
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Controls</h4>
      
      {/* View Controls */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={() => fgRef.current?.zoomToFit(400)}
          style={buttonStyle}
        >
          🔍 Fit to Screen
        </button>
        <button
          onClick={() => fgRef.current?.centerAt(0, 0, 1000)}
          style={buttonStyle}
        >
          🎯 Center
        </button>
        <button
          onClick={onReset}
          style={{ ...buttonStyle, background: '#e74c3c' }}
        >
          🔄 Reset All
        </button>
      </div>
      
      {/* Edge Type Filter */}
      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
        <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
          Edge Types
        </strong>
        {Object.entries(edgeTypeLabels).map(([type, label]) => (
          <label 
            key={type}
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '6px 0',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <input
              type="checkbox"
              checked={edgeTypeFilter[Number(type)]}
              onChange={(e) => onEdgeTypeFilterChange(Number(type), e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <div style={{
              width: '20px',
              height: '3px',
              background: edgeTypeColors[Number(type)],
              marginRight: '8px',
            }} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      
      {/* Display Options */}
      {!is3D && ( // Conditionally render this section only for 2D graphs
        <div style={{ paddingTop: '12px', borderTop: '1px solid #ddd' }}>
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
            Display
          </strong>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '12px',
          }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => onShowLabelsChange(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span>Show Labels</span>
          </label>
        </div>
      )}
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  margin: '4px 0',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '4px',
  background: '#3498db',
  color: 'white',
  fontSize: '12px',
  fontWeight: 'bold',
  transition: 'background 0.2s',
};

export default Controls;
