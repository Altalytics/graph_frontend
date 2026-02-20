import React, { useState } from 'react';
import type { GraphData } from '../types/graph';

interface FileUploadProps {
  onDataLoaded: (data: GraphData) => void;
  onLoadSample: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onLoadSample }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Updated validation for the new, richer data structure
  const validateGraphData = (data: any): data is GraphData => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON: Not an object.');
    }
    if (!data.nodes || !Array.isArray(data.nodes)) {
      throw new Error('Invalid JSON: "nodes" array is required.');
    }
    if (!data.edges || !Array.isArray(data.edges)) {
      throw new Error('Invalid JSON: "edges" array is required.');
    }
    
    // Validate a sample node to ensure all required metrics are present
    if (data.nodes.length > 0) {
      const sampleNode = data.nodes[0];
      const requiredNodeFields: (keyof import('../types/graph').Node)[] = [
        'node_id', 'user_id', 'total_degree', 'cluster', 
        'cluster_cohesion', 'cluster_distance', 'influence_score'
      ];
      for (const field of requiredNodeFields) {
        if (sampleNode[field] === undefined) {
          throw new Error(`Node object is missing required field: "${field}"`);
        }
      }
    }
    
    // Validate a sample edge
    if (data.edges.length > 0) {
      const sampleEdge = data.edges[0];
      if (sampleEdge.source === undefined || sampleEdge.target === undefined) {
        throw new Error('Edge object must have "source" and "target" fields.');
      }
    }
    
    return true;
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (validateGraphData(data)) {
        console.log(`✅ Loaded ${data.nodes.length} nodes and ${data.edges.length} edges`);
        onDataLoaded(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error loading file: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        padding: '50px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0', 
          color: '#2c3e50',
          fontSize: '32px',
          fontWeight: '700',
        }}>
          Twitter Network Visualizer
        </h1>
        <p style={{ 
          margin: '0 0 40px 0', 
          color: '#7f8c8d',
          fontSize: '16px',
          lineHeight: '1.6',
        }}>
          Upload your `graph_output.json` file or load the sample data to begin.
        </p>
        
        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: dragActive ? '3px dashed #3498db' : '3px dashed #ddd',
            borderRadius: '12px',
            padding: '40px',
            marginBottom: '20px',
            background: dragActive ? '#f0f7ff' : '#f8f9fa',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📁</div>
          <p style={{ margin: '0 0 15px 0', color: '#555', fontSize: '16px' }}>
            Drag and drop your JSON file here
          </p>
          <p style={{ margin: '0 0 20px 0', color: '#999', fontSize: '14px' }}>or</p>
          
          <label style={{
            display: 'inline-block',
            padding: '15px 35px',
            background: '#3498db',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background 0.3s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#2980b9'}
          onMouseOut={(e) => e.currentTarget.style.background = '#3498db'}
          >
            {loading ? 'Loading...' : 'Browse Files'}
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Load Sample Button */}
        <button
          onClick={onLoadSample}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            background: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background 0.3s',
            marginBottom: '20px',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#27ae60'}
          onMouseOut={(e) => e.currentTarget.style.background = '#2ecc71'}
        >
          🎯 Load Sample Data
        </button>
        
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            fontSize: '14px',
            textAlign: 'left',
          }}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
