# Twitter Network Graph Visualization

A React-based 3D network visualization tool for analyzing Twitter interaction graphs with advanced cluster analysis and causal impact metrics.

## Features

- **3D Force-Directed Graph**: Interactive 3D visualization using Three.js and WebGL
- **Cluster Analysis**: Visual representation of network communities with spatial grouping
- **Causal Impact Metrics**: Node sizing based on causal impact scores with degree fallback
- **Interactive Filtering**: Filter by edge types (retweet, reply, mention) and clusters
- **Detailed Node Information**: Click nodes to view comprehensive metrics
- **Cluster Statistics**: View community-level analytics in the info panel
- **File Upload**: Drag-and-drop or browse to load custom graph data
- **Sample Data**: Built-in example dataset for quick testing

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm run preview
```

## Data Format

Your JSON file must include nodes and edges with the following structure:

```json
{
  "nodes": [
    {
      "node_id": 1,
      "user_id": 123456789,
      "screen_name": "username",
      "cluster": 0,
      "causal_impact": 0.0411,
      "out_degree": 1,
      "in_degree": 1,
      "total_degree": 2,
      "degree_percentile": 99.821,
      "is_influencer": true,
      "is_active": true,
      "influence_score": 2.125,
      "cluster_cohesion": 0.748,
      "cluster_distance": 0.295,
      "intra_cluster_edges": 0,
      "inter_cluster_edges": 2
    }
  ],
  "edges": [
    {
      "source": 1,
      "target": 2,
      "edge_type": 0,
      "edge_type_name": "retweet",
      "weight": 1.0
    }
  ],
  "metadata": {
    "nodeCount": 2,
    "edgeCount": 1,
    "edgeTypes": {
      "0": "retweet",
      "1": "reply",
      "2": "mention"
    },
    "clusterNames": {
      "0": "Core Amplifiers",
      "1": "Journalists",
      "-1": "Unclustered"
    }
  }
}
```

### Required Node Fields

| Field | Type | Description |
|-------|------|-------------|
| `node_id` | number | Unique node identifier |
| `user_id` | number | Twitter user ID |
| `screen_name` | string/null | Twitter username |
| `cluster` | number | Community ID (-1 for unclustered) |
| `causal_impact` | number/null | Impact score (used for node sizing) |
| `out_degree` | number | Outgoing connections |
| `in_degree` | number | Incoming connections |
| `total_degree` | number | Total connections |
| `degree_percentile` | number | Percentile rank by degree |
| `is_influencer` | boolean | Influencer status |
| `is_active` | boolean | Activity status |
| `influence_score` | number | Influence metric |
| `cluster_cohesion` | number | Integration within cluster (0-1) |
| `cluster_distance` | number | Distance from cluster center (0-1) |
| `intra_cluster_edges` | number | Connections within cluster |
| `inter_cluster_edges` | number | Connections to other clusters |

### Required Edge Fields

| Field | Type | Description |
|-------|------|-------------|
| `source` | number | Source node_id |
| `target` | number | Target node_id |
| `edge_type` | number | 0=retweet, 1=reply, 2=mention |
| `edge_type_name` | string | Human-readable edge type |
| `weight` | number | Edge weight |

### Optional Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `metadata.nodeCount` | number | Precomputed node count for reference |
| `metadata.edgeCount` | number | Precomputed edge count for reference |
| `metadata.edgeTypes` | object | Mapping of edge type ids to labels |
| `metadata.clusterNames` | object | Optional mapping of cluster ids to display names |

If `metadata.clusterNames` is present, the sidebar and selected-node panel use those names. Missing entries fall back to the default labels: `Unclustered` for `-1`, otherwise `Community <id>`.

## Visual Encoding

### Nodes

- **Color**: Cluster membership (9 distinct colors, grey for unclustered)
- **Size**: Based on `causal_impact` (falls back to `total_degree` if null/zero)
- **Opacity**: Full opacity for selected cluster, 20% for others when filtering

### Edges

- **Retweet** (type 0): White with 50% opacity
- **Reply** (type 1): Light blue with 70% opacity
- **Mention** (type 2): Orange with 70% opacity

### Cluster Colors

| Cluster | Color |
|---------|-------|
| 0 | Purple (#9467bd) |
| 1 | Green (#2ca02c) |
| 2 | Orange (#ff7f0e) |
| 3 | Blue (#1f77b4) |
| 4 | Brown (#8c564b) |
| 5 | Pink (#e377c2) |
| 6 | Grey (#7f7f7f) |
| 7 | Olive (#bcbd22) |
| 8 | Cyan (#17becf) |
| -1 | Light Grey (unclustered) |

## Controls

### Mouse Controls

- **Left Click + Drag**: Rotate camera
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in/out
- **Click Node**: Select and view details
- **Click Background**: Deselect node
- **Click Cluster** (in sidebar): Filter by community

### Control Panel (Bottom Right)

- **Fit to Screen**: Auto-zoom to fit all nodes
- **Center**: Reset camera to origin
- **Reset All**: Clear all filters and selections
- **Edge Type Filters**: Toggle visibility of retweet/reply/mention edges

### Info Panel (Top Left)

- **Network Statistics**: Total nodes, edges, communities
- **Causal Impact Coverage**: Percentage of nodes with valid impact data
- **Community List**: Click to filter, shows node count and metrics
- **Selected Node Details**: Comprehensive metrics for clicked nodes

## Metrics Explained

### Causal Impact
Primary metric for node sizing. Represents the node's influence on network dynamics. When null or zero, the visualization falls back to using `total_degree`.

### Cluster Cohesion (0-1)
Percentage of connections within the same cluster:
- **0.7-1.0**: Highly integrated cluster member
- **0.3-0.7**: Moderately integrated
- **0.0-0.3**: Bridge node connecting clusters

### Cluster Distance (0-1)
Normalized distance from cluster center:
- **0.0-0.3**: Core member
- **0.3-0.7**: Regular member
- **0.7-1.0**: Edge member

### Influence Score
Ratio of in-degree to out-degree, indicating how much a node receives vs. sends interactions.

## Technology Stack

- **React 19.2.0** - UI framework
- **TypeScript 5.9.3** - Type safety
- **Three.js 0.182.0** - 3D rendering engine
- **react-force-graph-3d 1.29.1** - 3D graph layout
- **D3.js 7.9.0** - Force simulation
- **Vite 7.2.4** - Build tool and dev server

## Project Structure

```
src/
├── components/
│   ├── GraphVisualization3D.tsx  # Main 3D graph component
│   ├── InfoPanel.tsx              # Left sidebar with stats
│   ├── Controls.tsx               # Bottom-right control panel
│   └── FileUpload.tsx             # File upload interface
├── types/
│   ├── graph.ts                   # TypeScript interfaces
│   └── d3-force-3d.d.ts          # Type definitions
├── utils/
│   └── graphUtils.ts              # Helper functions
├── assets/
│   └── sample-graph.json          # Example dataset
├── App.tsx                        # Main app component
└── main.tsx                       # Entry point
```

## Performance

- **Recommended**: Up to 500 nodes for smooth interaction
- **Maximum**: Can handle 1000+ nodes with reduced performance
- **Optimization**: Uses reusable Three.js geometries and material caching
- **Physics**: Continuous force simulation with custom cluster forces

## Browser Requirements

- **WebGL Support**: Required for 3D rendering
- **Recommended**: Chrome/Edge (best performance)
- **Supported**: Firefox, Safari 15+
- **Hardware Acceleration**: Must be enabled

## Known Issues

### AFRAME Console Warning

You may see this warning in the console:
```
Uncaught ReferenceError: AFRAME is not defined at checkpoint-controls.js:3:1
```

**This is harmless and can be ignored.** It's from the `aframe-extras` dependency used by `react-force-graph-3d`. The 3D visualization works perfectly despite this warning.

## Troubleshooting

### Blank Screen
1. Check browser console for actual errors (ignore AFRAME warning)
2. Verify JSON data matches required format
3. Try loading sample data first
4. Ensure WebGL is enabled in browser settings

### Performance Issues
1. Reduce dataset size (filter low-degree nodes)
2. Disable edge types in controls
3. Use cluster filtering to view subsets
4. Close other browser tabs

### File Upload Fails
1. Verify JSON is valid (use JSONLint)
2. Check all required fields are present
3. Ensure numeric fields are numbers, not strings
4. Review console for specific validation errors

## Development

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Type checking
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## License

MIT License - Free to use for personal and commercial projects.

## Acknowledgments

- **Three.js** for WebGL rendering capabilities
- **D3.js** for force simulation algorithms
