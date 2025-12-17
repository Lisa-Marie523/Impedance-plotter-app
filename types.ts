
export interface DataPoint {
  freq: number;
  real: number;
  imag: number; // Raw value
  negImag: number; // -Imag(Z) for Nyquist
}

export interface ImpedanceDataset {
  id: string;
  name: string;
  data: DataPoint[];
  color: string;
  isVisible: boolean;
}

export type PlotMode = 'line' | 'scatter' | 'both';

export interface ChartSettings {
  xMax: number | undefined;
  xMin: number | undefined;
  yMax: number | undefined;
  yMin: number | undefined;
  showGrid: boolean;
  aspectRatioLocked: boolean;
  // New customization fields
  chartTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  // Visual Style
  plotMode: PlotMode;
  lineWidth: number;
  symbolSize: number;
  // Axis Configuration
  xTickCount: number;
  yTickCount: number;
  axisLineWidth: number; // Thickness of axis lines AND zero reference lines
  xTickStep: number | undefined; // Manual step size for X ticks
  yTickStep: number | undefined; // Manual step size for Y ticks
  // Filtering
  minFrequency: number | undefined;
  maxFrequency: number | undefined;
}

export interface CsvParseResult {
  filename: string;
  data: DataPoint[];
  error?: string;
}
