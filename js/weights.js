/**
 * YarnWeightCalculator - Calculates combined yarn weights from multiple strands
 * Uses thickness-based combination rather than averaging
 */
export class YarnWeightCalculator {
  constructor(weightsData) {
    this.weights = weightsData.weights;
    this.suggestions = weightsData.suggestedCombinations || [];
    this.buildLookups();
  }

  /**
   * Build lookup tables for faster access
   */
  buildLookups() {
    this.weightById = {};
    this.weightByName = {};
    
    this.weights.forEach(weight => {
      this.weightById[weight.id] = weight;
      this.weightByName[weight.name.toLowerCase()] = weight;
    });
  }

  /**
   * Get yarn weight by ID
   */
  getWeight(id) {
    return this.weightById[id];
  }

  /**
   * Get yarn weight by name
   */
  getWeightByName(name) {
    return this.weightByName[name.toLowerCase()];
  }

  /**
   * Get all yarn weights
   */
  getAllWeights() {
    return this.weights;
  }

  /**
   * Calculate combined thickness from multiple yarn strands
   * Uses physical thickness addition (not averaging)
   */
  getCombinedThickness(strandIds) {
    let totalThickness = 0;
    
    strandIds.forEach(id => {
      const weight = this.getWeight(id);
      if (weight) {
        totalThickness += weight.thickness;
      }
    });
    
    return totalThickness;
  }

  /**
   * Calculate combined weight category from multiple strands
   * Returns the closest matching standard yarn weight
   */
  calculateCombinedWeight(strandIds) {
    if (!strandIds || strandIds.length === 0) {
      return null;
    }

    // Get total thickness
    const combinedThickness = this.getCombinedThickness(strandIds);

    // Find closest matching weight
    let closestWeight = this.weights[0];
    let minDifference = Math.abs(combinedThickness - closestWeight.thickness);

    for (let i = 1; i < this.weights.length; i++) {
      const weight = this.weights[i];
      const difference = Math.abs(combinedThickness - weight.thickness);
      
      if (difference < minDifference) {
        minDifference = difference;
        closestWeight = weight;
      }
    }

    return {
      weight: closestWeight,
      exactThickness: combinedThickness,
      strandCount: strandIds.length,
      strands: strandIds.map(id => this.getWeight(id))
    };
  }

  /**
   * Calculate combined WPI (wraps per inch)
   * Uses inverse relationship: combining yarns decreases WPI
   */
  getCombinedWPI(strandIds) {
    const combinedThickness = this.getCombinedThickness(strandIds);
    
    // Find the closest weight to get base WPI
    const result = this.calculateCombinedWeight(strandIds);
    if (!result) return null;

    // Interpolate WPI based on thickness
    const exactWPI = this.interpolateWPI(combinedThickness);
    
    return {
      approximate: result.weight.wpi,
      calculated: Math.round(exactWPI * 10) / 10
    };
  }

  /**
   * Interpolate WPI value based on thickness
   */
  interpolateWPI(thickness) {
    // Find surrounding weight categories
    let lower = this.weights[0];
    let upper = this.weights[this.weights.length - 1];

    for (let i = 0; i < this.weights.length - 1; i++) {
      const current = this.weights[i];
      const next = this.weights[i + 1];
      
      if (thickness >= current.thickness && thickness <= next.thickness) {
        lower = current;
        upper = next;
        break;
      }
    }

    // Linear interpolation
    if (lower === upper) {
      return lower.wpi;
    }

    const ratio = (thickness - lower.thickness) / (upper.thickness - lower.thickness);
    return lower.wpi - (lower.wpi - upper.wpi) * ratio;
  }

  /**
   * Estimate gauge for combined yarns
   * Returns stitches and rows per 4 inches
   */
  estimateCombinedGauge(strandIds) {
    const result = this.calculateCombinedWeight(strandIds);
    if (!result) return null;

    const baseGauge = result.weight.gauge;
    const combinedThickness = result.exactThickness;
    const standardThickness = result.weight.thickness;

    // Adjust gauge based on actual vs standard thickness
    const thicknessRatio = combinedThickness / standardThickness;
    
    return {
      stitches: Math.round(baseGauge.stitches / thicknessRatio),
      rows: Math.round(baseGauge.rows / thicknessRatio),
      per: baseGauge.per,
      note: thicknessRatio !== 1 
        ? `Adjusted from standard ${result.weight.name} gauge`
        : `Standard ${result.weight.name} gauge`
    };
  }

  /**
   * Get recommended needle size for combined yarns
   */
  getRecommendedNeedleSize(strandIds) {
    const result = this.calculateCombinedWeight(strandIds);
    if (!result) return null;

    return {
      mm: result.weight.needleSize.mm,
      us: result.weight.needleSize.us,
      weight: result.weight.name
    };
  }

  /**
   * Get suggested combinations
   */
  getSuggestions() {
    return this.suggestions.map(suggestion => ({
      ...suggestion,
      strands: suggestion.strands.map(id => this.getWeight(id)),
      result: this.getWeight(suggestion.result)
    }));
  }

  /**
   * Check if a combination matches a suggestion
   */
  matchesSuggestion(strandIds) {
    // Sort strand IDs for comparison
    const sortedInput = [...strandIds].sort((a, b) => a - b);
    
    for (const suggestion of this.suggestions) {
      const sortedSuggestion = [...suggestion.strands].sort((a, b) => a - b);
      
      if (this.arraysEqual(sortedInput, sortedSuggestion)) {
        return {
          matches: true,
          description: suggestion.description,
          result: this.getWeight(suggestion.result)
        };
      }
    }
    
    return { matches: false };
  }

  /**
   * Helper: Check if two arrays are equal
   */
  arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
  }

  /**
   * Get visual properties for rendering
   */
  getVisualProperties(strandIds) {
    const result = this.calculateCombinedWeight(strandIds);
    if (!result) return null;

    // Average twist factor from all strands
    let totalTwist = 0;
    result.strands.forEach(strand => {
      totalTwist += strand.visual.twist;
    });
    const avgTwist = totalTwist / result.strands.length;

    return {
      color: result.weight.visual.color,
      twist: avgTwist,
      thickness: result.exactThickness,
      strandCount: strandIds.length
    };
  }

  /**
   * Generate detailed report for combined yarns
   */
  generateReport(strandIds) {
    const combined = this.calculateCombinedWeight(strandIds);
    if (!combined) return null;

    const wpi = this.getCombinedWPI(strandIds);
    const gauge = this.estimateCombinedGauge(strandIds);
    const needles = this.getRecommendedNeedleSize(strandIds);
    const suggestion = this.matchesSuggestion(strandIds);

    return {
      combined,
      wpi,
      gauge,
      needles,
      suggestion,
      summary: this.generateSummaryText(combined, suggestion)
    };
  }

  /**
   * Generate human-readable summary
   */
  generateSummaryText(combined, suggestion) {
    const strandNames = combined.strands.map(s => s.name).join(' + ');
    const result = `${strandNames} ≈ ${combined.weight.name}`;
    
    if (suggestion.matches) {
      return `${result} (${suggestion.description})`;
    }
    
    return result;
  }
}
