import { useState } from 'react';
import FileUpload from './components/FileUpload';
import GraphVisualizationD3 from './components/GraphVisualizationD3';
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
        <GraphVisualizationD3 data={graphData} onReset={handleReset} />
      ) : (
        <FileUpload onDataLoaded={handleDataLoaded} onLoadSample={handleLoadSample} />
      )}
    </div>
  );
}

export default App;
