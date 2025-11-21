
import React, { useRef } from 'react';
import { ImpedanceDataset, ChartSettings, PlotMode } from '../types';
import { Upload, FolderOpen, Download, FileUp, Trash2, Wand2, RefreshCw, Type, CheckSquare, Square, PaintBucket, Activity, Filter } from 'lucide-react';

interface SidebarProps {
  datasets: ImpedanceDataset[];
  settings: ChartSettings;
  onUploadFiles: (files: FileList) => void;
  onUpdateDataset: (id: string, updates: Partial<ImpedanceDataset>) => void;
  onUpdateAllDatasets: (visible: boolean) => void;
  onRemoveDataset: (id: string) => void;
  onUpdateSettings: (updates: Partial<ChartSettings>) => void;
  onAutoColor: () => void;
  onMakeAllBlack: () => void;
  onExportSettings: () => void;
  onImportSettings: (file: File) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  datasets,
  settings,
  onUploadFiles,
  onUpdateDataset,
  onUpdateAllDatasets,
  onRemoveDataset,
  onUpdateSettings,
  onAutoColor,
  onMakeAllBlack,
  onExportSettings,
  onImportSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const settingsInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col text-sm overflow-hidden flex-shrink-0 shadow-sm z-10">
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-scientific-accent"></div>
          ImpedanceViz Pro
        </h1>
        <p className="text-slate-500 text-xs mt-1">Advanced Nyquist Analysis</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Import Section */}
        <section>
          <h3 className="text-slate-500 font-semibold uppercase text-xs mb-3 tracking-wider">Data Import</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3 bg-white hover:bg-gray-50 rounded-md transition-colors border border-dashed border-gray-300 hover:border-blue-400 text-slate-700 group"
            >
              <Upload size={20} className="mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">CSV Files</span>
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3 bg-white hover:bg-gray-50 rounded-md transition-colors border border-dashed border-gray-300 hover:border-amber-400 text-slate-700 group"
            >
              <FolderOpen size={20} className="mb-2 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Scan Folder</span>
            </button>
          </div>

          <input 
            type="file" 
            multiple 
            accept=".csv,.txt,.dat" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => e.target.files && onUploadFiles(e.target.files)} 
          />
           <input 
            type="file" 
            // @ts-ignore - webkitdirectory is non-standard but supported in most browsers
            webkitdirectory=""
            directory=""
            ref={folderInputRef} 
            className="hidden" 
            onChange={(e) => e.target.files && onUploadFiles(e.target.files)} 
          />
          
          <div className="text-xs text-slate-400 mt-2 italic">
            Supports: freq, Hz, real, z', imag, z'' (case-insensitive)
          </div>
        </section>

        {/* Dataset Management */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Datasets ({datasets.length})</h3>
            {datasets.length > 0 && (
               <div className="flex gap-2">
                 <button 
                  onClick={onMakeAllBlack}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors border border-transparent hover:border-gray-200 rounded px-1"
                  title="Set all to black"
                >
                  <PaintBucket size={12} /> Black
                </button>
                 <button 
                  onClick={onAutoColor}
                  className="text-xs flex items-center gap-1 text-scientific-accent hover:text-blue-700 transition-colors border border-transparent hover:border-gray-200 rounded px-1"
                  title="Auto-color all datasets"
                >
                  <Wand2 size={12} /> Auto
                </button>
               </div>
            )}
          </div>

          {datasets.length > 0 && (
            <div className="flex gap-2 mb-2 text-xs">
              <button 
                onClick={() => onUpdateAllDatasets(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-600 py-1 rounded flex items-center justify-center gap-1 border border-gray-200 transition-colors"
              >
                <CheckSquare size={12} /> All
              </button>
              <button 
                onClick={() => onUpdateAllDatasets(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-600 py-1 rounded flex items-center justify-center gap-1 border border-gray-200 transition-colors"
              >
                <Square size={12} /> None
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {datasets.length === 0 ? (
              <div className="text-slate-400 text-center py-4 italic bg-gray-50 rounded border border-dashed border-gray-200">
                No data loaded
              </div>
            ) : (
              datasets.map(ds => (
                <div key={ds.id} className="bg-white rounded p-2 border border-gray-200 flex items-center gap-3 hover:border-blue-300 transition-colors group shadow-sm">
                   <input 
                    type="checkbox" 
                    checked={ds.isVisible} 
                    onChange={(e) => onUpdateDataset(ds.id, { isVisible: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <input 
                      type="text" 
                      value={ds.name} 
                      onChange={(e) => onUpdateDataset(ds.id, { name: e.target.value })}
                      className="bg-transparent text-xs w-full focus:outline-none text-slate-700 font-medium truncate focus:bg-gray-50 rounded px-1"
                    />
                    <div className="text-[10px] text-slate-400 px-1">{ds.data.length} points</div>
                  </div>

                  <input 
                    type="color" 
                    value={ds.color}
                    onChange={(e) => onUpdateDataset(ds.id, { color: e.target.value })}
                    className="w-6 h-6 rounded overflow-hidden border-none bg-transparent cursor-pointer"
                    title="Change Color"
                  />
                  
                  <button 
                    onClick={() => onRemoveDataset(ds.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Filter Settings */}
        <section>
          <h3 className="text-slate-500 font-semibold uppercase text-xs mb-3 tracking-wider">Data Filtering</h3>
          <div className="space-y-2 bg-gray-50 border border-gray-200 p-3 rounded">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
              <Filter size={14} />
              <span className="font-bold">Frequency Range (Hz)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Min Freq</label>
                <input 
                  type="number" 
                  value={settings.minFrequency ?? ''} 
                  onChange={(e) => onUpdateSettings({ minFrequency: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5 font-medium">Max Freq</label>
                <input 
                  type="number" 
                  value={settings.maxFrequency ?? ''} 
                  onChange={(e) => onUpdateSettings({ maxFrequency: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Max"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Plot Settings */}
        <section>
          <h3 className="text-slate-500 font-semibold uppercase text-xs mb-3 tracking-wider">Configuration</h3>
          
          <div className="space-y-3">
             {/* Visual Style */}
             <div className="space-y-2 bg-gray-50 border border-gray-200 p-3 rounded">
               <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                 <Activity size={14} />
                 <span className="font-bold">Visual Style</span>
               </div>
               
               {/* Mode Selector */}
               <div className="grid grid-cols-3 gap-1 mb-2">
                 {(['both', 'line', 'scatter'] as PlotMode[]).map(mode => (
                   <button
                    key={mode}
                    onClick={() => onUpdateSettings({ plotMode: mode })}
                    className={`text-[10px] py-1.5 rounded capitalize border transition-all font-medium ${settings.plotMode === mode ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-gray-100 border-transparent text-slate-500 hover:bg-gray-200'}`}
                   >
                     {mode === 'both' ? 'Combined' : mode}
                   </button>
                 ))}
               </div>

               {/* Sliders */}
               <div className="space-y-3 pt-1">
                 {settings.plotMode !== 'scatter' && (
                   <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Line Width</span>
                        <span className="font-mono">{settings.lineWidth}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" max="6" step="0.5"
                        value={settings.lineWidth}
                        onChange={(e) => onUpdateSettings({ lineWidth: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                   </div>
                 )}
                 
                 {settings.plotMode !== 'line' && (
                   <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Symbol Size</span>
                        <span className="font-mono">{settings.symbolSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="8" step="1"
                        value={settings.symbolSize}
                        onChange={(e) => onUpdateSettings({ symbolSize: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                   </div>
                 )}
               </div>
             </div>

            {/* Labels Config */}
             <div className="space-y-2 bg-gray-50 border border-gray-200 p-3 rounded">
               <div className="flex items-center gap-2 text-slate-600 text-xs mb-1">
                 <Type size={14} />
                 <span className="font-bold">Labels & Title</span>
               </div>
               <div>
                <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Title</label>
                <input 
                  type="text" 
                  value={settings.chartTitle} 
                  onChange={(e) => onUpdateSettings({ chartTitle: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">X Axis Label</label>
                  <input 
                    type="text" 
                    value={settings.xAxisLabel} 
                    onChange={(e) => onUpdateSettings({ xAxisLabel: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Y Axis Label</label>
                   <input 
                    type="text" 
                    value={settings.yAxisLabel} 
                    onChange={(e) => onUpdateSettings({ yAxisLabel: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                  />
                </div>
              </div>
             </div>

             {/* Limits */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">X Max</label>
                <input 
                  type="number" 
                  value={settings.xMax || ''} 
                  onChange={(e) => onUpdateSettings({ xMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Auto"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Y Max</label>
                <input 
                  type="number" 
                  value={settings.yMax || ''} 
                  onChange={(e) => onUpdateSettings({ yMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Auto"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700"
                />
              </div>
            </div>

            <div className="h-px bg-gray-200 my-2"></div>

            <div className="flex items-center justify-between">
               <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer font-medium">
                  <input 
                    type="checkbox" 
                    checked={settings.aspectRatioLocked} 
                    onChange={(e) => onUpdateSettings({ aspectRatioLocked: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Isometric Scale (1:1)
               </label>
            </div>
            
            <div className="flex items-center justify-between">
               <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer font-medium">
                  <input 
                    type="checkbox" 
                    checked={settings.showGrid} 
                    onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  Show Grid
               </label>
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Settings IO */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
        <div className="flex gap-2">
          <button 
            onClick={onExportSettings}
            className="flex-1 bg-white hover:bg-gray-100 border border-gray-300 text-slate-600 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Download size={14} /> Export
          </button>
          <button 
            onClick={() => settingsInputRef.current?.click()}
            className="flex-1 bg-white hover:bg-gray-100 border border-gray-300 text-slate-600 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <FileUp size={14} /> Import
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={settingsInputRef} 
            className="hidden"
            onChange={(e) => e.target.files && e.target.files[0] && onImportSettings(e.target.files[0])}
          />
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full text-slate-400 hover:text-slate-600 py-1 text-[10px] flex items-center justify-center gap-1 transition-colors"
        >
          <RefreshCw size={10} /> Reset App
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
