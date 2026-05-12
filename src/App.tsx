import { useState, useEffect } from 'react';
import GraphVisualizationD3 from './components/GraphVisualizationD3';
import type { GraphData } from './types/graph';
import './App.css';

const DATASETS = [
  { id: 'actors',   label: 'Actors'   },
  { id: 'models',   label: 'Models'   },
  { id: 'concepts', label: 'Concepts' },
  { id: 'policy',   label: 'Policy'   },
] as const;

type DatasetId = typeof DATASETS[number]['id'];

function App() {
  const [activeDataset, setActiveDataset] = useState<DatasetId>('actors');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ds = params.get('dataset') as DatasetId | null;
    if (ds && DATASETS.some(d => d.id === ds)) {
      setActiveDataset(ds);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGraphData(null);

    fetch(`${import.meta.env.BASE_URL}data/${activeDataset}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Dataset not found (${res.status})`);
        return res.json();
      })
      .then((data: GraphData) => {
        setGraphData(data);
        setLoading(false);
        const url = new URL(window.location.href);
        url.searchParams.set('dataset', activeDataset);
        window.history.replaceState(null, '', url.toString());
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeDataset]);

  return (
    <div className="App">
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#07071a', color: 'rgba(255,255,255,0.7)',
          fontFamily: 'system-ui, sans-serif', gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>⬤</div>
          <div style={{ fontSize: 16 }}>Loading {activeDataset} dataset…</div>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#07071a', color: 'rgba(255,255,255,0.7)',
          fontFamily: 'system-ui, sans-serif', gap: 12,
        }}>
          <div style={{ fontSize: 14, color: '#e74c3c' }}>Failed to load: {error}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Make sure <code>public/data/{activeDataset}.json</code> exists.
          </div>
        </div>
      )}

      {graphData && !loading && (
        <GraphVisualizationD3
          data={graphData}
          datasets={DATASETS}
          activeDataset={activeDataset}
          onDatasetChange={setActiveDataset}
        />
      )}
    </div>
  );
}

export default App;
