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
}

export interface CsvParseResult {
  filename: string;
  data: DataPoint[];
  error?: string;
}