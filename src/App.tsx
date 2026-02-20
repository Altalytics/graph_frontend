import { useState } from 'react';
import FileUpload from './components/FileUpload';
import GraphVisualization3D from './components/GraphVisualization3D';
import type { GraphData } from './types/graph';
import sampleData from './assets/sample-graph.json';
import './App.css';

function App() {
  // Initialize with null, so the FileUpload component shows first.
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const handleDataLoaded = (data: GraphData) => {
    setGraphData(data);
  };

  const handleLoadSample = () => {
    // Perform validation on sample data just in case
    if (sampleData?.nodes && sampleData?.edges) {
      setGraphData(sampleData as unknown as GraphData);
    } else {
      alert('Sample data is invalid.');
    }
  };

  const handleReset = () => {
    setGraphData(null);
  };

  return (
    <div className="App">
      {graphData ? (
        <>
          <GraphVisualization3D data={graphData} />
          {/* "Upload New" button is always available when viewing a graph */}
          <button
            onClick={handleReset}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              padding: '12px 24px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
              transition: 'all 0.3s',
              zIndex: 10
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            📤 Upload New File
          </button>
        </>
      ) : (
        <FileUpload onDataLoaded={handleDataLoaded} onLoadSample={handleLoadSample} />
      )}
    </div>
  );
}

export default App;
