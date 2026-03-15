import { YarnRenderer } from './yarnRenderer.js';
import { SwatchRenderer } from './swatchRenderer.js';
import { YarnWeightCalculator } from './weights.js';
import { ColorManager } from './colors.js';

/**
 * YarnApp - Main application controller
 * Manages yarn weight calculation, 3D visualization, and UI
 */
export class YarnApp {
  constructor() {
    this.calculator = null;
    this.yarnRenderer = null;
    this.swatchRenderer = null;
    this.colorManager = new ColorManager('brights');
    
    // Application state
    this.strands = [];
    this.maxStrands = 6;
    this.currentMode = 'experiment'; // 'experiment' or 'suggestion'
    
    // DOM elements
    this.elements = {
      equation: document.getElementById('equation-text'),
      yarnCanvas: document.getElementById('yarn-canvas'),
      swatchCanvas: document.getElementById('swatch-canvas'),
      strandList: document.getElementById('strand-list'),
      addStrandBtn: document.getElementById('add-strand'),
      clearStrandsBtn: document.getElementById('clear-strands'),
      resultWeight: document.getElementById('result-weight'),
      resultGauge: document.getElementById('result-gauge'),
      resultNeedle: document.getElementById('result-needle'),
      suggestionsContainer: document.getElementById('suggestions-list'),
      needleSelect: document.getElementById('needle-select'),
      swatchInfo: document.getElementById('swatch-info')
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('=== YarnApp Initialization Started ===');
      
      // Load yarn weights data
      console.log('Fetching yarnWeights.json...');
      const response = await fetch('./yarnWeights.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch yarnWeights.json: ${response.status}`);
      }
      const weightsData = await response.json();
      console.log('Weights data loaded:', weightsData);
      
      this.calculator = new YarnWeightCalculator(weightsData);
      console.log('Calculator created');
      
      console.log('Canvas elements:', {
        yarnCanvas: this.elements.yarnCanvas,
        swatchCanvas: this.elements.swatchCanvas,
        yarnCanvasSize: this.elements.yarnCanvas ? 
          `${this.elements.yarnCanvas.clientWidth}x${this.elements.yarnCanvas.clientHeight}` : 'null',
        swatchCanvasSize: this.elements.swatchCanvas ? 
          `${this.elements.swatchCanvas.clientWidth}x${this.elements.swatchCanvas.clientHeight}` : 'null'
      });
      
      // Initialize renderers
      console.log('Creating YarnRenderer...');
      this.yarnRenderer = new YarnRenderer(this.elements.yarnCanvas);
      console.log('YarnRenderer created:', this.yarnRenderer);
      
      console.log('Creating SwatchRenderer...');
      this.swatchRenderer = new SwatchRenderer(
        this.elements.swatchCanvas,
        this.elements.needleSelect
      );
      console.log('SwatchRenderer created:', this.swatchRenderer);
      
      // Setup UI
      console.log('Setting up event listeners...');
      this.setupEventListeners();
      console.log('Populating weight selectors...');
      this.populateWeightSelectors();
      console.log('Rendering suggestions...');
      this.renderSuggestions();
      console.log('Populating needle sizes...');
      this.populateNeedleSizes();
      
      // Start with one strand
      console.log('Adding initial strand...');
      this.addStrand();
      console.log('Initial strand added');
      
      console.log('=== YarnApp initialized successfully ===');
    } catch (error) {
      console.error('!!! Failed to initialize YarnApp:', error);
      console.error('Error stack:', error.stack);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add strand button
    this.elements.addStrandBtn.addEventListener('click', () => {
      this.addStrand();
    });

    // Clear strands button
    this.elements.clearStrandsBtn.addEventListener('click', () => {
      this.clearStrands();
    });

    // Needle size change
    this.elements.needleSelect.addEventListener('change', () => {
      this.updateSwatch();
    });
  }

  /**
   * Populate weight selectors in the UI
   */
  populateWeightSelectors() {
    // This will be called when creating strand rows
    // Store weights for easy access
    this.weights = this.calculator.getAllWeights();
  }

  /**
   * Populate needle size selector
   */
  populateNeedleSizes() {
    const needleSizes = [
      { value: 2.0, label: '2.0mm (US 0)' },
      { value: 2.25, label: '2.25mm (US 1)' },
      { value: 2.75, label: '2.75mm (US 2)' },
      { value: 3.0, label: '3.0mm (US 2-3)' },
      { value: 3.25, label: '3.25mm (US 3)' },
      { value: 3.5, label: '3.5mm (US 4)' },
      { value: 3.75, label: '3.75mm (US 5)' },
      { value: 4.0, label: '4.0mm (US 6)' },
      { value: 4.5, label: '4.5mm (US 7)' },
      { value: 5.0, label: '5.0mm (US 8)' },
      { value: 5.5, label: '5.5mm (US 9)' },
      { value: 6.0, label: '6.0mm (US 10)' },
      { value: 6.5, label: '6.5mm (US 10.5)' },
      { value: 8.0, label: '8.0mm (US 11)' },
      { value: 9.0, label: '9.0mm (US 13)' },
      { value: 10.0, label: '10.0mm (US 15)' },
      { value: 12.0, label: '12.0mm (US 17)' },
      { value: 15.0, label: '15.0mm (US 19)' }
    ];

    needleSizes.forEach(size => {
      const option = document.createElement('option');
      option.value = size.value;
      option.textContent = size.label;
      this.elements.needleSelect.appendChild(option);
    });

    // Set default to 4.5mm (US 7)
    this.elements.needleSelect.value = '4.5';
  }

  /**
   * Add a new strand
   */
  addStrand() {
    console.log('addStrand called, current strands:', this.strands.length);
    if (this.strands.length >= this.maxStrands) {
      console.log('Max strands reached');
      return;
    }

    // Create strand data
    const strand = {
      id: Date.now() + Math.random(),
      weightId: 4, // Default to Worsted
      color: this.colorManager.getColorAtIndex(this.strands.length),
      twistIntensity: 1.0
    };

    console.log('New strand created:', strand);
    this.strands.push(strand);
    this.renderStrandList();
    this.updateExperimentView();
  }

  /**
   * Remove a strand
   */
  removeStrand(strandId) {
    this.strands = this.strands.filter(s => s.id !== strandId);
    this.renderStrandList();
    this.updateExperimentView();
  }

  /**
   * Clear all strands
   */
  clearStrands() {
    this.strands = [];
    this.renderStrandList();
    this.updateExperimentView();
  }

  /**
   * Update strand weight
   */
  updateStrandWeight(strandId, weightId) {
    const strand = this.strands.find(s => s.id === strandId);
    if (strand) {
      strand.weightId = parseInt(weightId);
      this.updateExperimentView();
    }
  }

  /**
   * Update strand color
   */
  updateStrandColor(strandId, color) {
    const strand = this.strands.find(s => s.id === strandId);
    if (strand) {
      strand.color = color;
      this.updateYarnVisualization();
      this.updateSwatch();
    }
  }

  /**
   * Render the strand list UI
   */
  renderStrandList() {
    this.elements.strandList.innerHTML = '';

    this.strands.forEach(strand => {
      const row = document.createElement('div');
      row.className = 'strand-row';

      // Weight selector
      const select = document.createElement('select');
      this.weights.forEach(weight => {
        const option = document.createElement('option');
        option.value = weight.id;
        option.textContent = weight.name;
        option.selected = weight.id === strand.weightId;
        select.appendChild(option);
      });
      select.addEventListener('change', (e) => {
        this.updateStrandWeight(strand.id, e.target.value);
      });

      // Color picker
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = strand.color;
      colorInput.addEventListener('change', (e) => {
        this.updateStrandColor(strand.id, e.target.value);
      });

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'remove';
      removeBtn.addEventListener('click', () => {
        this.removeStrand(strand.id);
      });

      row.appendChild(select);
      row.appendChild(colorInput);
      row.appendChild(removeBtn);
      this.elements.strandList.appendChild(row);
    });

    // Update add button state
    this.elements.addStrandBtn.disabled = this.strands.length >= this.maxStrands;
  }

  /**
   * Update experiment view (equation, results, visualization)
   */
  updateExperimentView() {
    console.log('updateExperimentView called');
    if (this.strands.length === 0) {
      console.log('No strands in updateExperimentView');
      this.clearResults();
      return;
    }

    // Calculate combined weight
    const strandIds = this.strands.map(s => s.weightId);
    console.log('Generating report for strand IDs:', strandIds);
    const report = this.calculator.generateReport(strandIds);

    if (!report) {
      console.log('No report generated');
      this.clearResults();
      return;
    }

    console.log('Report generated:', report);
    
    // Update equation
    this.updateEquation(report);

    // Update results
    this.updateResults(report);

    // Update visualizations
    this.updateYarnVisualization();
    this.updateSwatch();
  }

  /**
   * Update equation display
   */
  updateEquation(report) {
    const strandNames = report.combined.strands.map(s => s.name);
    const equation = `${strandNames.join(' + ')} = ${report.combined.weight.name}`;
    this.elements.equation.textContent = equation;
  }

  /**
   * Update results panel
   */
  updateResults(report) {
    // Weight result
    if (this.elements.resultWeight) {
      this.elements.resultWeight.textContent = report.combined.weight.name;
    }

    // Gauge info
    if (this.elements.resultGauge) {
      const gauge = report.gauge;
      this.elements.resultGauge.textContent = 
        `${gauge.stitches} sts × ${gauge.rows} rows per ${gauge.per}`;
    }

    // Needle size info
    if (this.elements.resultNeedle) {
      const needles = report.needles;
      this.elements.resultNeedle.textContent = 
        `${needles.mm} (US ${needles.us})`;
    }
  }

  /**
   * Clear results display
   */
  clearResults() {
    this.elements.equation.textContent = 'click + add strand to begin';
    if (this.elements.resultWeight) this.elements.resultWeight.textContent = '—';
    if (this.elements.resultGauge) this.elements.resultGauge.textContent = '—';
    if (this.elements.resultNeedle) this.elements.resultNeedle.textContent = '—';
    this.yarnRenderer.clear();
    this.swatchRenderer.clear();
  }

  /**
   * Update yarn 3D visualization
   */
  updateYarnVisualization() {
    console.log('updateYarnVisualization called, strands:', this.strands.length);
    console.log('yarnRenderer exists?', !!this.yarnRenderer);
    
    if (this.strands.length === 0) {
      console.log('No strands, clearing');
      this.yarnRenderer.clear();
      return;
    }

    const visualStrands = this.strands.map(strand => {
      const weight = this.calculator.getWeight(strand.weightId);
      return {
        color: strand.color,
        twistIntensity: strand.twistIntensity,
        thickness: weight ? weight.thickness : 2.0 // Use thickness from weight data
      };
    });

    console.log('Calling renderCombinedStrands with:', visualStrands);
    this.yarnRenderer.renderCombinedStrands(visualStrands);
  }

  /**
   * Update swatch preview
   */
  updateSwatch() {
    if (this.strands.length === 0) {
      this.swatchRenderer.clear();
      this.elements.swatchInfo.textContent = '';
      return;
    }

    // Get combined color (average of strand colors)
    const avgColor = this.calculateAverageColor(this.strands.map(s => s.color));
    
    // Get needle size
    const needleSize = parseFloat(this.elements.needleSelect.value);
    
    // Render swatch
    this.swatchRenderer.renderSwatch(avgColor, needleSize);

    // Update info
    const strandIds = this.strands.map(s => s.weightId);
    const gauge = this.calculator.estimateCombinedGauge(strandIds);
    if (gauge) {
      this.elements.swatchInfo.textContent = 
        `${gauge.stitches} sts × ${gauge.rows} rows`;
    }
  }

  /**
   * Calculate average color from multiple hex colors
   */
  calculateAverageColor(hexColors) {
    if (hexColors.length === 1) {
      return hexColors[0];
    }

    let totalR = 0, totalG = 0, totalB = 0;

    hexColors.forEach(hex => {
      const rgb = this.colorManager.hexToRgb(hex);
      if (rgb) {
        totalR += rgb.r;
        totalG += rgb.g;
        totalB += rgb.b;
      }
    });

    const count = hexColors.length;
    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    return this.colorManager.rgbToHex(avgR, avgG, avgB);
  }

  /**
   * Render suggested combinations
   */
  renderSuggestions() {
    const suggestions = this.calculator.getSuggestions();
    
    this.elements.suggestionsContainer.innerHTML = '';

    suggestions.forEach(suggestion => {
      const card = document.createElement('button');
      card.className = 'suggestion-card';

      const title = document.createElement('h4');
      title.textContent = suggestion.description;

      const detail = document.createElement('p');
      const strandNames = suggestion.strands.map(s => s.name).join(' + ');
      detail.textContent = `${strandNames} → ${suggestion.result.name}`;

      card.appendChild(title);
      card.appendChild(detail);

      card.addEventListener('click', () => {
        this.applySuggestion(suggestion);
      });

      this.elements.suggestionsContainer.appendChild(card);
    });
  }

  /**
   * Apply a suggested combination
   */
  applySuggestion(suggestion) {
    // Clear current strands
    this.strands = [];

    // Add strands from suggestion
    suggestion.strands.forEach((weight, index) => {
      const strand = {
        id: Date.now() + Math.random() + index,
        weightId: weight.id,
        color: this.colorManager.getColorAtIndex(index),
        twistIntensity: 1.0
      };
      this.strands.push(strand);
    });

    // Update UI
    this.renderStrandList();
    this.updateExperimentView();
  }

  /**
   * Cleanup and destroy app
   */
  destroy() {
    if (this.yarnRenderer) {
      this.yarnRenderer.destroy();
    }
    if (this.swatchRenderer) {
      this.swatchRenderer.destroy();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new YarnApp();
  app.init();

  // Expose to window for debugging
  window.yarnApp = app;
});
