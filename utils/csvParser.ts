import { DataPoint, CsvParseResult } from '../types';

// Helper to clean and split lines
const splitLine = (line: string): string[] => {
  // Handle comma, semicolon, or tab delimiters
  if (line.includes(';')) return line.split(';');
  if (line.includes('\t')) return line.split('\t');
  return line.split(',');
};

// Intelligent column detection with expanded keywords
const detectColumnIndices = (header: string[]) => {
  // Clean headers but preserve internal primes/apostrophes (z', z'')
  const lowerHeader = header.map(h => {
    let cleaned = h.trim().toLowerCase();
    // Remove surrounding quotes only
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  });

  let freqIdx = -1;
  let realIdx = -1;
  let imagIdx = -1;

  // Expanded keywords based on user request
  // Note: order matters slightly for substring matches
  const freqKeywords = ['freq', 'hz', 'f', 'frequency', 'frequenz'];
  
  // Real part keywords: z', real, re(z), z_real
  const realKeywords = ["z'", 'real', 're(z)', 'zr', 'z_real', "z'"];
  
  // Imaginary part keywords: z'', imag, im(z), z_imag. 
  // Note: -Im(Z) is sometimes a column name too.
  const imagKeywords = ["z''", 'imag', 'im(z)', 'zi', 'z_imag', '-im(z)', "z''"];

  lowerHeader.forEach((col, idx) => {
    // Check Frequency
    if (freqIdx === -1 && freqKeywords.some(k => col === k || col.includes(k))) {
        freqIdx = idx;
    }
    
    // Check Real
    // We check specific exact matches first for z', then contains
    if (realIdx === -1) {
      if (col === "z'" || col === "z_real" || col === "re(z)") {
        realIdx = idx;
      } else if (realKeywords.some(k => col.includes(k)) && !col.includes('freq')) {
        realIdx = idx;
      }
    }

    // Check Imaginary
    if (imagIdx === -1) {
      if (col === "z''" || col === "z_imag" || col === "im(z)") {
        imagIdx = idx;
      } else if (imagKeywords.some(k => col.includes(k))) {
        imagIdx = idx;
      }
    }
  });

  return { freqIdx, realIdx, imagIdx };
};

export const parseCSV = async (file: File): Promise<CsvParseResult> => {
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    
    if (lines.length < 2) {
      return { filename: file.name, data: [], error: 'File is empty or too short' };
    }

    // Try to find the header line. Sometimes there is metadata at the top.
    let headerIndex = 0;
    let indices = { freqIdx: -1, realIdx: -1, imagIdx: -1 };
    
    // Scan first 30 lines for a valid header
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const potentialHeader = splitLine(lines[i]);
      const detected = detectColumnIndices(potentialHeader);
      
      // We strictly need Real and Imag columns
      if (detected.realIdx !== -1 && detected.imagIdx !== -1) {
        headerIndex = i;
        indices = detected;
        break;
      }
    }

    if (indices.realIdx === -1 || indices.imagIdx === -1) {
      return { 
        filename: file.name, 
        data: [], 
        error: 'Columns not found. Expected: Freq, Real(Z)/Z\', Imag(Z)/Z\'\'' 
      };
    }

    const data: DataPoint[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const row = splitLine(lines[i]);
      
      // Skip if row is shorter than the indices we need
      if (row.length <= Math.max(indices.realIdx, indices.imagIdx)) continue;

      // Parse values, replacing commas with dots for European formats if necessary
      const cleanFloat = (val: string) => {
        if (!val) return NaN;
        return parseFloat(val.replace(',', '.'));
      };

      const real = cleanFloat(row[indices.realIdx]);
      const imag = cleanFloat(row[indices.imagIdx]);
      // Freq might be missing in some raw formats
      const freq = indices.freqIdx !== -1 ? cleanFloat(row[indices.freqIdx]) : 0;

      if (!isNaN(real) && !isNaN(imag)) {
        data.push({
          freq: isNaN(freq) ? 0 : freq,
          real,
          imag,
          // Standard Nyquist: -Imag(Z) on Y axis
          // NOTE: Some devices export Imag as negative for capacitive. 
          // Typically Nyquist is (-Im vs Re).
          negImag: -imag 
        });
      }
    }

    if (data.length === 0) {
        return { filename: file.name, data: [], error: 'Header found, but no valid numeric data parsed.' };
    }

    return { filename: file.name, data };

  } catch (e) {
    return { filename: file.name, data: [], error: 'File read error: Malformed CSV.' };
  }
};