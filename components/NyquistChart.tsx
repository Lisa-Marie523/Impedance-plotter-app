
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ImpedanceDataset, ChartSettings } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Move, Image as ImageIcon, FileCode } from 'lucide-react';

interface NyquistChartProps {
  datasets: ImpedanceDataset[];
  settings: ChartSettings;
  onUpdateDataset: (id: string, updates: Partial<ImpedanceDataset>) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 border border-gray-200 p-3 rounded shadow-xl text-xs backdrop-blur-sm z-50 ring-1 ring-black/5">
        <p className="text-slate-700 mb-1 font-bold border-b border-gray-100 pb-1">Point Data</p>
        <div className="space-y-0.5">
          <p className="text-slate-600"><span className="font-semibold text-blue-600">Re(Z):</span> {data.real.toExponential(3)} Ω</p>
          <p className="text-slate-600"><span className="font-semibold text-amber-600">-Im(Z):</span> {data.negImag.toExponential(3)} Ω</p>
          <p className="text-slate-600"><span className="font-semibold text-emerald-600">Freq:</span> {data.freq.toExponential(3)} Hz</p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Dot shape to control size independently
const CustomSymbol = (props: any) => {
  const { cx, cy, fill, size } = props;
  // Recharts sometimes passes null coords if out of range
  if (cx === null || cy === null) return null;
  return <circle cx={cx} cy={cy} r={size} fill={fill} stroke="none" />;
};

const NyquistChart: React.FC<NyquistChartProps> = ({ datasets, settings, onUpdateDataset }) => {
  const visibleDatasets = useMemo(() => datasets.filter(d => d.isVisible), [datasets]);
  const containerRef = useRef<HTMLDivElement>(null);

  // View State
  const [userDomains, setUserDomains] = useState<{x: [number, number], y: [number, number]} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{x: number, y: number, domains: {x: [number, number], y: [number, number]}} | null>(null);

  // 1. Calculate Auto Domains (Base) based on visible data
  const baseDomains = useMemo(() => {
    if (visibleDatasets.length === 0) return { x: [0, 100], y: [0, 100] };

    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    visibleDatasets.forEach(ds => {
      ds.data.forEach(p => {
        if (p.real < xMin) xMin = p.real;
        if (p.real > xMax) xMax = p.real;
        if (p.negImag < yMin) yMin = p.negImag;
        if (p.negImag > yMax) yMax = p.negImag;
      });
    });

    // Apply padding
    const xPadding = Math.abs(xMax - xMin) * 0.05 || 1;
    const yPadding = Math.abs(yMax - yMin) * 0.05 || 1;
    
    let finalXMin = xMin - xPadding;
    let finalXMax = settings.xMax ?? (xMax + xPadding);
    
    // Nyquist typically starts at 0 unless settings dictate otherwise
    let finalYMin = settings.yMin ?? Math.min(0, yMin - yPadding);
    let finalYMax = settings.yMax ?? (yMax + yPadding);

    // Aspect Ratio Locking (Isometric)
    if (settings.aspectRatioLocked) {
      const xRange = finalXMax - finalXMin;
      const yRange = finalYMax - finalYMin;
      const maxRange = Math.max(xRange, yRange);

      // Center the smaller dimension
      if (xRange < maxRange) {
        const diff = maxRange - xRange;
        finalXMin -= diff / 2;
        finalXMax += diff / 2;
      } else {
        const diff = maxRange - yRange;
        finalYMin -= diff / 2;
        finalYMax += diff / 2;
      }
    }

    // Ensure min < max
    if (finalXMin >= finalXMax) finalXMax = finalXMin + 1;
    if (finalYMin >= finalYMax) finalYMax = finalYMin + 1;

    return {
      x: [finalXMin, finalXMax] as [number, number],
      y: [finalYMin, finalYMax] as [number, number]
    };
  }, [visibleDatasets, settings]);

  // 2. Determine Active Domains
  const domains = userDomains || baseDomains;

  // --- Zoom & Pan Handlers ---

  const applyZoom = (factor: number) => {
    const xRange = domains.x[1] - domains.x[0];
    const yRange = domains.y[1] - domains.y[0];
    
    const newXRange = xRange * factor;
    const newYRange = yRange * factor;

    const xCenter = (domains.x[0] + domains.x[1]) / 2;
    const yCenter = (domains.y[0] + domains.y[1]) / 2;

    setUserDomains({
      x: [xCenter - newXRange / 2, xCenter + newXRange / 2],
      y: [yCenter - newYRange / 2, yCenter + newYRange / 2]
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Scrolling down (positive delta) usually means "move down the page", 
    // but in maps/charts it often means Zoom Out. 
    // However, standard Google Maps: Scroll Up = Zoom In, Scroll Down = Zoom Out.
    // deltaY > 0 is Scroll Down.
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    applyZoom(scaleFactor);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only enable pan if we are hitting the chart area, not buttons
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      domains: { x: [...domains.x], y: [...domains.y] }
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const { domains: startDomains } = dragStartRef.current;

    // Calculate scale: units per pixel
    const xScale = (startDomains.x[1] - startDomains.x[0]) / width;
    const yScale = (startDomains.y[1] - startDomains.y[0]) / height;

    const xShift = dx * xScale; 
    const yShift = -dy * yScale; // Inverted because screen Y is opposite to Cartesian Y

    setUserDomains({
      x: [startDomains.x[0] - xShift, startDomains.x[1] - xShift],
      y: [startDomains.y[0] - yShift, startDomains.y[1] - yShift]
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const resetZoom = () => {
    setUserDomains(null);
  };

  // --- Image Export ---
  const downloadChart = (format: 'png' | 'svg') => {
    if (!containerRef.current) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const filename = (settings.chartTitle || 'nyquist_plot').replace(/\s+/g, '_').toLowerCase();

    if (format === 'svg') {
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // PNG
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      // 2x Scale for high resolution
      const scale = 2; 
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        // Draw white background (transparent by default in SVG)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col group select-none bg-white rounded-lg">
      {settings.chartTitle && (
        <div className="text-center text-slate-800 font-bold py-2 text-lg bg-white border-b border-gray-100 shrink-0">
          {settings.chartTitle}
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`flex-1 min-h-0 relative cursor-crosshair ${isDragging ? 'cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={resetZoom}
      >
        {visibleDatasets.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gray-50 rounded-b-lg">
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-30 grayscale">📊</div>
              <p className="font-medium">No visible data</p>
              <p className="text-sm mt-1 text-slate-500">Enable datasets in legend or sidebar</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
              {settings.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              
              <XAxis 
                type="number" 
                dataKey="real" 
                name="Real(Z)" 
                domain={domains.x} 
                allowDataOverflow={true} // Important for Zoom
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => val.toPrecision(3)}
                label={{ 
                  value: settings.xAxisLabel, 
                  position: 'bottom', 
                  offset: 0, 
                  fill: '#475569', 
                  fontSize: 12,
                  fontWeight: 500
                }}
              />
              
              <YAxis 
                type="number" 
                dataKey="negImag" 
                name="-Imag(Z)" 
                domain={domains.y} 
                allowDataOverflow={true} // Important for Zoom
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(val) => val.toPrecision(3)}
                label={{ 
                  value: settings.yAxisLabel, 
                  angle: -90, 
                  position: 'left', 
                  offset: 10, 
                  fill: '#475569', 
                  fontSize: 12,
                  fontWeight: 500,
                  style: { textAnchor: 'middle' }
                }}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} />

              {/* Zero Lines - slightly darker than grid */}
              <ReferenceLine x={0} stroke="#94a3b8" />
              <ReferenceLine y={0} stroke="#94a3b8" />

              {visibleDatasets.map(ds => {
                // Logic for displaying Line, Symbols or Both
                const showLine = settings.plotMode !== 'scatter';
                const showSymbols = settings.plotMode !== 'line';

                return (
                  <Scatter 
                    key={ds.id} 
                    name={ds.name} 
                    data={ds.data} 
                    fill={ds.color} 
                    // Line configuration
                    line={showLine ? { stroke: ds.color, strokeWidth: settings.lineWidth } : false}
                    // Symbol configuration
                    shape={showSymbols ? (props: any) => <CustomSymbol {...props} size={settings.symbolSize} /> : () => null}
                    isAnimationActive={false} // Better performance when zooming
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {/* Interaction Hints & Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <div className="flex gap-1 pointer-events-auto bg-white/95 backdrop-blur rounded-lg border border-gray-200 shadow-lg p-1 ring-1 ring-black/5 items-center z-20">
             <button 
               onClick={(e) => { e.stopPropagation(); applyZoom(0.8); }}
               className="p-1.5 hover:bg-gray-100 rounded text-slate-600 transition-colors" 
               title="Zoom In"
             >
               <ZoomIn size={16} />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); applyZoom(1.25); }}
               className="p-1.5 hover:bg-gray-100 rounded text-slate-600 transition-colors" 
               title="Zoom Out"
             >
               <ZoomOut size={16} />
             </button>
             
             {userDomains && (
               <>
                 <div className="w-px h-4 bg-gray-200 mx-1"></div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                   className="p-1.5 hover:bg-gray-100 rounded text-blue-600 transition-colors" 
                   title="Reset View"
                 >
                   <RotateCcw size={16} />
                 </button>
               </>
             )}

             <div className="w-px h-4 bg-gray-200 mx-1"></div>
             
             <button 
               onClick={(e) => { e.stopPropagation(); downloadChart('png'); }}
               className="p-1.5 hover:bg-gray-100 rounded text-slate-600 transition-colors" 
               title="Download as PNG"
             >
               <ImageIcon size={16} />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); downloadChart('svg'); }}
               className="p-1.5 hover:bg-gray-100 rounded text-slate-600 transition-colors" 
               title="Download as SVG"
             >
               <FileCode size={16} />
             </button>

          </div>
        </div>

        {/* Help Text overlay */}
        <div className="absolute top-2 left-4 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white/80 p-1 rounded backdrop-blur-sm z-10">
           <div className="flex items-center gap-1"><Move size={10}/> Drag to Pan</div>
           <div className="flex items-center gap-1"><ZoomIn size={10}/> Scroll to Zoom</div>
           <div className="flex items-center gap-1"><RotateCcw size={10}/> Double-click Reset</div>
        </div>
      </div>
      
      {/* Legend Overlay - Only shows VISIBLE datasets */}
      <div className="absolute top-12 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 p-2 rounded max-h-[200px] overflow-y-auto custom-scrollbar select-none z-10 shadow-md ring-1 ring-black/5">
         <div className="text-[10px] uppercase text-slate-500 font-bold mb-1 px-1 tracking-wider">Legend</div>
         {visibleDatasets.map(ds => (
           <div 
              key={ds.id} 
              onClick={() => onUpdateDataset(ds.id, { isVisible: false })}
              className="flex items-center gap-2 text-xs text-slate-700 mb-1 last:mb-0 cursor-pointer hover:bg-gray-100 p-1 rounded transition-all"
              title="Click to hide"
           >
             <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm border border-black/10" 
                style={{ backgroundColor: ds.color }}
             ></div>
             <span className="truncate max-w-[120px] font-medium">
               {ds.name}
             </span>
           </div>
         ))}
         {visibleDatasets.length === 0 && <span className="text-xs text-slate-400 italic p-1">No data visible</span>}
      </div>
    </div>
  );
};

export default NyquistChart;
