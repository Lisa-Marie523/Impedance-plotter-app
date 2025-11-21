import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import NyquistChart from './components/NyquistChart';
import { ImpedanceDataset, ChartSettings } from './types';
import { parseCSV } from './utils/csvParser';
import { DEFAULT_COLORS, TURBO_PALETTE } from './constants';

const STORAGE_KEY = 'impedance_viz_state_v1';

const DEFAULT_SETTINGS: ChartSettings = {
  xMax: undefined,
  xMin: undefined,
  yMax: undefined,
  yMin: undefined,
  showGrid: true,
  aspectRatioLocked: true,
  chartTitle: "Nyquist Plot",
  xAxisLabel: "Real(Z) [Ω]",
  yAxisLabel: "-Imag(Z) [Ω]",
  plotMode: 'both',
  lineWidth: 2,
  symbolSize: 3
};

const App: React.FC = () => {
  // Initialize State from Local Storage
  const [datasets, setDatasets] = useState<ImpedanceDataset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.datasets) ? parsed.datasets : [];
      }
    } catch (e) {
      console.error("Failed to load datasets from storage", e);
    }
    return [];
  });

  const [settings, setSettings] = useState<ChartSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist if schema changes
        return { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
      }
    } catch (e) {
      console.error("Failed to load settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistence Effect
  useEffect(() => {
    try {
      const stateToSave = { datasets, settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn("Failed to save state to localStorage", e);
      // Only show error if we have data to save
      if (datasets.length > 0) {
        setErrorMsg("Storage Warning: Browser storage full. Data may not persist after reload.");
        // Auto dismiss warning
        setTimeout(() => setErrorMsg(null), 5000);
      }
    }
  }, [datasets, settings]);

  // Handle File Uploads
  const handleUploadFiles = useCallback(async (files: FileList) => {
    setLoading(true);
    setErrorMsg(null);
    
    const newDatasets: ImpedanceDataset[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await parseCSV(file);
      
      if (result.error || result.data.length === 0) {
        errors.push(`${file.name}: ${result.error}`);
        continue;
      }

      const id = `ds-${Date.now()}-${i}`;
      // Assign next color in cycle
      const colorIndex = (datasets.length + i) % DEFAULT_COLORS.length;
      
      newDatasets.push({
        id,
        name: file.name.replace(/\.(csv|txt|dat)$/i, ''),
        data: result.data,
        color: DEFAULT_COLORS[colorIndex],
        isVisible: true
      });
    }

    setDatasets(prev => [...prev, ...newDatasets]);
    setLoading(false);

    if (errors.length > 0) {
      // Show robust error feedback similar to st.warning
      setErrorMsg(`Import Warnings: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      // Auto-dismiss after 8 seconds
      setTimeout(() => setErrorMsg(null), 8000);
    }
  }, [datasets.length]);

  // Dataset updates
  const updateDataset = (id: string, updates: Partial<ImpedanceDataset>) => {
    setDatasets(prev => prev.map(ds => ds.id === id ? { ...ds, ...updates } : ds));
  };

  const updateAllDatasets = (visible: boolean) => {
    setDatasets(prev => prev.map(ds => ({ ...ds, isVisible: visible })));
  };

  const removeDataset = (id: string) => {
    setDatasets(prev => prev.filter(ds => ds.id !== id));
  };

  const autoColor = () => {
    setDatasets(prev => prev.map((ds, idx) => ({
      ...ds,
      // Use a turbo-like palette or distribute Hue for scientific look
      color: TURBO_PALETTE[idx % TURBO_PALETTE.length]
    })));
  };

  const makeAllBlack = () => {
    setDatasets(prev => prev.map(ds => ({
      ...ds,
      color: '#000000'
    })));
  };

  // Settings IO
  const exportSettings = () => {
    const payload = {
      version: 3, 
      date: new Date().toISOString(),
      settings,
      datasets: datasets.map(ds => ({
        name: ds.name,
        color: ds.color,
        isVisible: ds.isVisible
      }))
    };
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'impedance_viz_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.settings) {
        // Merge imported settings with defaults to ensure new fields exist
        setSettings(prev => ({ ...prev, ...json.settings }));
      }
      if (json.datasets && Array.isArray(json.datasets)) {
         setDatasets(prev => prev.map(ds => {
           const saved = json.datasets.find((s: any) => s.name === ds.name);
           return saved ? { ...ds, color: saved.color, isVisible: saved.isVisible } : ds;
         }));
      }
    } catch (e) {
      setErrorMsg("Invalid settings file");
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        datasets={datasets}
        settings={settings}
        onUploadFiles={handleUploadFiles}
        onUpdateDataset={updateDataset}
        onUpdateAllDatasets={updateAllDatasets}
        onRemoveDataset={removeDataset}
        onUpdateSettings={(s) => setSettings(prev => ({ ...prev, ...s }))}
        onAutoColor={autoColor}
        onMakeAllBlack={makeAllBlack}
        onExportSettings={exportSettings}
        onImportSettings={importSettings}
      />

      <main className="flex-1 h-full relative flex flex-col">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scientific-accent"></div>
          </div>
        )}
        
        {errorMsg && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-amber-50 text-amber-800 px-6 py-3 rounded shadow-lg z-50 text-sm border border-amber-200 max-w-xl flex items-center gap-3">
            <div className="font-bold">⚠️ Attention</div>
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="flex-1 p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full h-full overflow-hidden relative">
            <NyquistChart 
              datasets={datasets} 
              settings={settings} 
              onUpdateDataset={updateDataset} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;