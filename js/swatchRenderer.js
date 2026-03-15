/**
 * Swatch Renderer - 3D Fabric Visualization
 * Renders a billowing knitted fabric using Three.js
 */

import * as THREE from 'three';

export class SwatchRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.width = canvasElement.width;
    this.height = canvasElement.height;
    
    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfafafa);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvasElement, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 3, 4);
    this.scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-2, -1, -2);
    this.scene.add(backLight);
    
    // Fabric mesh
    this.fabricMesh = null;
    this.fabricGeometry = null;
    this.originalPositions = null;
    
    // Animation
    this.time = 0;
    this.animationId = null;
    this.isAnimating = false;
    
    // Values
    this.needleSize = 4.0;
    this.yarnThickness = 4;
    this.colors = ['#555555'];
    this.strands = [];
    
    this.createPlaceholder();
    this.startAnimation();
  }

  setNeedleSize(mm) {
    this.needleSize = parseFloat(mm);
  }

  calculateGauge() {
    const baseGauge = 20;
    const needleFactor = 4.0 / this.needleSize;
    const yarnFactor = 1 - (this.yarnThickness - 4) * 0.08;
    return Math.round(baseGauge * needleFactor * yarnFactor * 10) / 10;
  }

  createPlaceholder() {
    if (this.fabricMesh) {
      this.scene.remove(this.fabricMesh);
      this.fabricMesh.geometry.dispose();
      this.fabricMesh.material.dispose();
    }
    
    const geometry = new THREE.PlaneGeometry(3, 3, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0
    });
    
    this.fabricMesh = new THREE.Mesh(geometry, material);
    this.fabricGeometry = geometry;
    this.originalPositions = geometry.attributes.position.array.slice();
    this.scene.add(this.fabricMesh);
  }

  createYarnTexture(strands) {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    if (!strands || strands.length === 0) {
      return new THREE.CanvasTexture(canvas);
    }
    
    const yarnWidth = 2.5 + (this.yarnThickness * 0.7);
    const stitchWidth = 14 + (this.needleSize * 2);
    const stitchHeight = stitchWidth * 1.2;
    
    const cols = Math.ceil(size / stitchWidth) + 2;
    const rows = Math.ceil(size / stitchHeight) + 2;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // RESTRUCTURED: Each column is a continuous strand snaking upward
    // Draw in layers for proper front/back interlocking:
    
    // LAYER 1: Draw all "ascending" segments (strand coming UP from behind)
    // These go BEHIND the loop arcs
    for (let col = 0; col < cols; col++) {
      this.drawColumnAscending(ctx, col, rows, stitchWidth, stitchHeight, strands, yarnWidth);
    }
    
    // LAYER 2: Draw all horizontal connections between columns
    // These connect the tops of adjacent columns
    for (let row = 0; row < rows; row++) {
      this.drawRowConnections(ctx, row, cols, stitchWidth, stitchHeight, strands, yarnWidth);
    }
    
    // LAYER 3: Draw all loop arcs (the rounded tops)
    // These go IN FRONT, creating the "pulled through" illusion
    for (let col = 0; col < cols; col++) {
      this.drawColumnArcs(ctx, col, rows, stitchWidth, stitchHeight, strands, yarnWidth);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 1.5);
    
    return texture;
  }

  /**
   * Draw the ASCENDING portions of a column's continuous strand
   * This is the yarn coming UP from behind the previous row's arc
   * Forms the "legs" of each V, but drawn as continuous upward paths
   */
  drawColumnAscending(ctx, col, rows, stitchWidth, stitchHeight, strands, yarnWidth) {
    const centerX = col * stitchWidth + stitchWidth / 2;
    const legSpread = stitchWidth * 0.28;
    
    const strandCount = strands.length;
    for (let s = 0; s < strandCount; s++) {
      const strand = strands[s];
      const rgb = this.hexToRgb(strand.color);
      const offset = (s - (strandCount - 1) / 2) * (yarnWidth * 0.1);
      const plyWidth = yarnWidth / Math.sqrt(strandCount);
      
      // Draw ascending segments for each row in this column
      for (let row = rows - 1; row >= 0; row--) {
        const topY = row * stitchHeight;
        const arcY = topY + stitchHeight * 0.15;        // where the arc sits
        const bottomY = topY + stitchHeight * 1.05;     // where legs reach into next row
        
        // LEFT ascending segment: from bottom-left up to arc-left
        // Shadow
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.5)}, ${Math.floor(rgb.g * 0.5)}, ${Math.floor(rgb.b * 0.5)})`;
        ctx.lineWidth = plyWidth * 1.15;
        this.drawAscendingLeg(ctx, centerX - legSpread + offset + 1, arcY + 1, bottomY + 1, stitchHeight, -1);
        
        // Main (slightly darker since it's "behind")
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.8)}, ${Math.floor(rgb.g * 0.8)}, ${Math.floor(rgb.b * 0.8)})`;
        ctx.lineWidth = plyWidth;
        this.drawAscendingLeg(ctx, centerX - legSpread + offset, arcY, bottomY, stitchHeight, -1);
        
        // RIGHT ascending segment: from bottom-right up to arc-right
        // Shadow
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.5)}, ${Math.floor(rgb.g * 0.5)}, ${Math.floor(rgb.b * 0.5)})`;
        ctx.lineWidth = plyWidth * 1.15;
        this.drawAscendingLeg(ctx, centerX + legSpread + offset + 1, arcY + 1, bottomY + 1, stitchHeight, 1);
        
        // Main
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.8)}, ${Math.floor(rgb.g * 0.8)}, ${Math.floor(rgb.b * 0.8)})`;
        ctx.lineWidth = plyWidth;
        this.drawAscendingLeg(ctx, centerX + legSpread + offset, arcY, bottomY, stitchHeight, 1);
      }
    }
  }

  /**
   * Draw one ascending leg of the strand
   * direction: -1 for left leg, +1 for right leg
   */
  drawAscendingLeg(ctx, x, arcY, bottomY, stitchHeight, direction) {
    const bulgeAmount = stitchHeight * 0.15 * direction;
    
    ctx.beginPath();
    ctx.moveTo(x, bottomY);  // Start at bottom
    ctx.bezierCurveTo(
      x + bulgeAmount, bottomY - stitchHeight * 0.3,   // bulge outward
      x + bulgeAmount, arcY + stitchHeight * 0.2,      // continue bulge
      x, arcY                                           // arrive at arc
    );
    ctx.stroke();
  }

  /**
   * Draw the ARCS at the top of each loop
   * These are drawn LAST so they appear IN FRONT of the ascending legs
   * Creating the illusion that the strand passes through the loop below
   */
  drawColumnArcs(ctx, col, rows, stitchWidth, stitchHeight, strands, yarnWidth) {
    const centerX = col * stitchWidth + stitchWidth / 2;
    const legSpread = stitchWidth * 0.28;
    const arcWidth = legSpread;
    
    const strandCount = strands.length;
    for (let s = 0; s < strandCount; s++) {
      const strand = strands[s];
      const rgb = this.hexToRgb(strand.color);
      const offset = (s - (strandCount - 1) / 2) * (yarnWidth * 0.1);
      const plyWidth = yarnWidth / Math.sqrt(strandCount);
      
      for (let row = 0; row < rows; row++) {
        const topY = row * stitchHeight;
        const arcY = topY + stitchHeight * 0.15;
        const arcHeight = stitchHeight * 0.18;
        
        // Shadow
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)})`;
        ctx.lineWidth = plyWidth * 1.15;
        this.drawArc(ctx, centerX + offset + 1, arcY + 1, arcWidth, arcHeight);
        
        // Main color (full brightness - this is the "front" part)
        ctx.strokeStyle = strand.color;
        ctx.lineWidth = plyWidth;
        this.drawArc(ctx, centerX + offset, arcY, arcWidth, arcHeight);
        
        // Highlight
        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = plyWidth * 0.3;
        this.drawArc(ctx, centerX + offset - 0.4, arcY - 0.4, arcWidth, arcHeight);
      }
    }
  }

  /**
   * Draw a rounded arc (the top of a loop)
   */
  drawArc(ctx, centerX, arcY, arcWidth, arcHeight) {
    ctx.beginPath();
    ctx.moveTo(centerX - arcWidth, arcY);
    ctx.bezierCurveTo(
      centerX - arcWidth, arcY - arcHeight,
      centerX + arcWidth, arcY - arcHeight,
      centerX + arcWidth, arcY
    );
    ctx.stroke();
  }

  /**
   * Draw horizontal connections between adjacent columns in the same row
   */
  drawRowConnections(ctx, row, cols, stitchWidth, stitchHeight, strands, yarnWidth) {
    const topY = row * stitchHeight;
    const arcY = topY + stitchHeight * 0.15;
    const legSpread = stitchWidth * 0.28;
    
    const strandCount = strands.length;
    for (let s = 0; s < strandCount; s++) {
      const strand = strands[s];
      const rgb = this.hexToRgb(strand.color);
      const offset = (s - (strandCount - 1) / 2) * (yarnWidth * 0.1);
      const plyWidth = yarnWidth / Math.sqrt(strandCount);
      
      for (let col = 0; col < cols - 1; col++) {
        const leftX = col * stitchWidth + stitchWidth / 2 + legSpread + offset;
        const rightX = (col + 1) * stitchWidth + stitchWidth / 2 - legSpread + offset;
        
        // Shadow
        ctx.strokeStyle = `rgb(${Math.floor(rgb.r * 0.55)}, ${Math.floor(rgb.g * 0.55)}, ${Math.floor(rgb.b * 0.55)})`;
        ctx.lineWidth = plyWidth * 1.15;
        this.drawConnection(ctx, leftX + 1, rightX + 1, arcY + 1, stitchHeight);
        
        // Main
        ctx.strokeStyle = strand.color;
        ctx.lineWidth = plyWidth;
        this.drawConnection(ctx, leftX, rightX, arcY, stitchHeight);
        
        // Highlight
        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = plyWidth * 0.3;
        this.drawConnection(ctx, leftX - 0.4, rightX - 0.4, arcY - 0.4, stitchHeight);
      }
    }
  }

  /**
   * Draw horizontal connection between two adjacent stitch columns
   */
  drawConnection(ctx, leftX, rightX, y, stitchHeight) {
    const sag = stitchHeight * 0.06;  // slight downward sag
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.bezierCurveTo(
      leftX + (rightX - leftX) * 0.3, y + sag,
      leftX + (rightX - leftX) * 0.7, y + sag,
      rightX, y
    );
    ctx.stroke();
  }

  createFabric(strands) {
    if (this.fabricMesh) {
      this.scene.remove(this.fabricMesh);
      this.fabricMesh.geometry.dispose();
      if (this.fabricMesh.material.map) {
        this.fabricMesh.material.map.dispose();
      }
      this.fabricMesh.material.dispose();
    }
    
    const segments = 64;
    const geometry = new THREE.PlaneGeometry(3.5, 3.5, segments, segments);
    const texture = this.createYarnTexture(strands);
    
    let avgR = 128, avgG = 128, avgB = 128;
    if (strands && strands.length > 0) {
      avgR = avgG = avgB = 0;
      strands.forEach(s => {
        const rgb = this.hexToRgb(s.color);
        avgR += rgb.r;
        avgG += rgb.g;
        avgB += rgb.b;
      });
      avgR = Math.round(avgR / strands.length);
      avgG = Math.round(avgG / strands.length);
      avgB = Math.round(avgB / strands.length);
    }
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
      color: new THREE.Color(`rgb(${avgR}, ${avgG}, ${avgB})`).lerp(new THREE.Color(0xffffff), 0.4)
    });
    
    this.fabricMesh = new THREE.Mesh(geometry, material);
    this.fabricGeometry = geometry;
    this.originalPositions = geometry.attributes.position.array.slice();
    this.fabricMesh.rotation.x = -0.2;
    
    this.scene.add(this.fabricMesh);
  }

  animateFabric() {
    if (!this.fabricMesh || !this.fabricGeometry) return;
    
    const positions = this.fabricGeometry.attributes.position.array;
    const original = this.originalPositions;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];
      
      const wave1 = Math.sin(x * 1.8 + this.time * 0.6) * 0.18;
      const wave2 = Math.sin(y * 2.2 + this.time * 0.9) * 0.14;
      const wave3 = Math.sin((x + y) * 1.2 + this.time * 0.4) * 0.1;
      const wave4 = Math.sin(x * 3.0 - this.time * 1.1) * 0.06;
      
      const edgeFactor = (1 - Math.pow(Math.abs(x) / 1.75, 3)) * 
                         (1 - Math.pow(Math.abs(y) / 1.75, 3));
      
      positions[i + 2] = (wave1 + wave2 + wave3 + wave4) * Math.max(0, edgeFactor);
    }
    
    this.fabricGeometry.attributes.position.needsUpdate = true;
    this.fabricGeometry.computeVertexNormals();
  }

  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.time += 0.016;
      this.animateFabric();
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  renderSwatch(color, needleSize) {
    this.setNeedleSize(needleSize);
    const strands = [{ color: color }];
    this.render(strands, 4);
  }

  render(strands, combinedThickness) {
    this.strands = strands || [];
    this.yarnThickness = combinedThickness || 4;
    this.colors = this.strands.map(s => s.color);
    
    if (this.strands.length === 0) {
      this.createPlaceholder();
    } else {
      this.createFabric(this.strands);
    }
  }

  clear() {
    this.createPlaceholder();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
  }

  destroy() {
    this.stopAnimation();
    if (this.fabricMesh) {
      this.scene.remove(this.fabricMesh);
      this.fabricMesh.geometry.dispose();
      if (this.fabricMesh.material.map) {
        this.fabricMesh.material.map.dispose();
      }
      this.fabricMesh.material.dispose();
    }
    this.renderer.dispose();
  }
}

export function createSwatchRenderer(canvasElement) {
  return new SwatchRenderer(canvasElement);
}
