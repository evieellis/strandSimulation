import * as THREE from 'three';

/**
 * YarnRenderer - 3D visualization of yarn balls and combined strands
 * Handles realistic yarn geometry with twisting and plying
 */
export class YarnRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.yarnMesh = null;
    this.animationId = null;
    this.time = 0;
    
    // Animation state
    this.isAnimating = false;
    this.animationDuration = 3.2; // seconds
    this.animationStartTime = 0;
    
    this.init();
  }

  /**
   * Initialize Three.js scene
   */
  init() {
    console.log('YarnRenderer init started');
    console.log('Canvas element:', this.canvas);
    console.log('Canvas dimensions:', {
      clientWidth: this.canvas.clientWidth,
      clientHeight: this.canvas.clientHeight,
      offsetWidth: this.canvas.offsetWidth,
      offsetHeight: this.canvas.offsetHeight
    });
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfafafa);

    // Camera setup - ensure canvas has dimensions
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 400;
    const aspect = width / height;
    
    console.log('Using dimensions:', { width, height, aspect });
    
    this.camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 16);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    console.log('Renderer created');

    // Lighting
    this.setupLighting();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    // Start render loop
    this.animate();
    console.log('YarnRenderer init complete');
  }

  /**
   * Setup scene lighting
   */
  setupLighting() {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);
  }

  /**
   * Handle window resize
   */
  onResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Main animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.time += 0.016;
    
    // Update twist animation if active
    if (this.isAnimating) {
      this.updateTwistAnimation();
    }

    // After tightening completes, keep a slow rotisserie-style spin.
    if (this.yarnMesh && !this.isAnimating && this.yarnMesh.userData.strands) {
      this.yarnMesh.userData.strands.forEach((strand) => {
        this.updateConvergingStrandGeometry(strand, 1.0, this.time * 0.28);
      });
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update twist animation progress
   */
  updateTwistAnimation() {
    const elapsed = (Date.now() - this.animationStartTime) / 1000;
    const progress = Math.min(elapsed / this.animationDuration, 1.0);
    
    // Smooth easing function
    const eased = this.easeInOutCubic(progress);
    
    // Tighten each strand from left-to-right into a knit-ready ply
    if (this.yarnMesh && this.yarnMesh.userData.strands) {
      this.yarnMesh.userData.strands.forEach((strand) => {
        this.updateConvergingStrandGeometry(strand, eased, this.time * 1.2);
      });
    }
    
    // Stop animation when complete
    if (progress >= 1.0) {
      this.isAnimating = false;
    }
  }

  /**
   * Easing function for smooth animation
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Create a single yarn strand with realistic geometry
   */
  createYarnBall(color, radius = 1.5, twist = 0.5) {
    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    
    // Create material with yarn-like properties
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false
    });

    const ball = new THREE.Mesh(geometry, material);
    
    // Add fiber texture
    this.addFiberTexture(ball, twist);
    
    return ball;
  }

  /**
   * Add fiber-like surface detail to yarn ball
   */
  addFiberTexture(mesh, twist) {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    
    // Add slight irregularity to surface
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Calculate noise based on position and twist
      const angle = Math.atan2(z, x);
      const noise = Math.sin(angle * 20 + y * twist * 10) * 0.02;
      
      // Apply displacement
      const length = Math.sqrt(x * x + y * y + z * z);
      const scale = (length + noise) / length;
      
      positions[i] = x * scale;
      positions[i + 1] = y * scale;
      positions[i + 2] = z * scale;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  /**
   * Create a twisting strand for plied yarn visualization
   */
  createTwistingStrand(color, length, radius, offset, twistIntensity = 1.0) {
    try {
      console.log('createTwistingStrand called:', { color, length, radius, offset, twistIntensity });
      
      const startYOffset = offset.y || 0;
      const startZOffset = offset.z || 0;
      const baseAngle = Math.atan2(startYOffset, startZOffset || 0.0001);

      console.log('Creating horizontal converging curve');
      const points = this.buildConvergingCurve({
        length,
        strandRadius: radius,
        startYOffset,
        startZOffset,
        baseAngle,
        twistIntensity,
        strandCount: offset.strandCount || 2
      }, 0.0, 0.0);

      const curve = new THREE.CatmullRomCurve3(points);
      console.log('Creating tube geometry');
      const tubeGeometry = new THREE.TubeGeometry(curve, 90, radius, 8, false);
      
      console.log('Creating material');
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85,
        metalness: 0.1
      });
      
      console.log('Creating mesh');
      const strand = new THREE.Mesh(tubeGeometry, material);
      
      // Store parametric values so geometry can tighten over time
      strand.userData.curveParams = {
        length,
        strandRadius: radius,
        startYOffset,
        startZOffset,
        baseAngle,
        twistIntensity,
        strandCount: offset.strandCount || 2
      };
      strand.userData.tubeSegments = 90;
      strand.userData.radialSegments = 8;
      strand.userData.tightness = 0.0;
      
      console.log('Strand created successfully');
      return strand;
    } catch (error) {
      console.error('Error in createTwistingStrand:', error);
      throw error;
    }
  }

  /**
   * Add fiber hairs along the strand
   */
  addFiberHairsHelix(strand, radius, color) {
    const hairCount = 60;
    const hairGeometry = new THREE.BufferGeometry();
    const hairPositions = [];
    
    for (let i = 0; i < hairCount; i++) {
      const t = i / hairCount;
      const y = (t - 0.5) * 6;
      const angle = t * Math.PI * 12;
      
      const x = Math.cos(angle) * radius * 1.2;
      const z = Math.sin(angle) * radius * 1.2;
      
      // Hair extends outward
      hairPositions.push(x, y, z);
      hairPositions.push(x * 1.3, y, z * 1.3);
    }
    
    hairGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(hairPositions, 3)
    );
    
    const hairMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(0.8),
      opacity: 0.3,
      transparent: true,
      linewidth: 1
    });
    
    const hairs = new THREE.LineSegments(hairGeometry, hairMaterial);
    strand.add(hairs);
  }

  /**
   * Create a horizontal strand path that converges and tightens to the right.
   */
  buildConvergingCurve(params, tightness, phaseOffset = 0) {
    const points = [];
    const segments = 90;
    const strandCount = Math.max(1, params.strandCount || 1);
    const startRadius = Math.max(
      Math.sqrt(params.startYOffset * params.startYOffset + params.startZOffset * params.startZOffset),
      params.strandRadius * 0.35
    );
    const tightenFactor = 1.0 - 0.65 * tightness;

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const x = (t - 0.5) * params.length;

      // Gradual left-to-right merge: bundle radius collapses toward one yarn at right.
      const baseConverge = Math.pow(1 - t, 1.08);
      // Keep a tiny shared radius for 3+ strands so each ply remains visible at the right end.
      const minConverge = strandCount > 2 ? 0.2 : 0.0;
      const converge = minConverge + (1 - minConverge) * baseConverge;
      const startOrbitRadius = startRadius * tightenFactor;
      const orbitRadius = startOrbitRadius * converge;

      // True plying: each strand orbits the shared centerline as it travels along X.
      const turns = params.twistIntensity * (1.4 + 3.0 * tightness) * (0.45 + 2.8 * t);
      const theta = params.baseAngle + (Math.PI * 2 * turns * t) + phaseOffset * 0.15;

      // Tiny per-strand wobble keeps the yarn from looking mechanically perfect.
      const wobble = params.strandRadius * 0.05;
      const y = orbitRadius * Math.cos(theta) + Math.sin(theta * 2.0) * wobble;
      const z = orbitRadius * Math.sin(theta) + Math.cos(theta * 1.6) * wobble * 0.75;
      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }

  /**
   * Rebuild one strand mesh from its parametric converging curve.
   */
  updateConvergingStrandGeometry(strand, tightness, phaseOffset) {
    const params = strand.userData.curveParams;
    if (!params) {
      return;
    }

    const points = this.buildConvergingCurve(params, tightness, phaseOffset);
    const curve = new THREE.CatmullRomCurve3(points);
    const nextGeometry = new THREE.TubeGeometry(
      curve,
      strand.userData.tubeSegments || 90,
      params.strandRadius,
      strand.userData.radialSegments || 8,
      false
    );

    strand.geometry.dispose();
    strand.geometry = nextGeometry;
    strand.userData.tightness = tightness;
  }

  /**
   * Render combined yarn strands with plying visualization
   */
  renderCombinedStrands(strands) {
    console.log('renderCombinedStrands called with', strands.length, 'strands');
    
    // Clear existing yarn
    if (this.yarnMesh) {
      this.scene.remove(this.yarnMesh);
      this.disposeObject(this.yarnMesh);
    }

    // Create group for all strands
    const group = new THREE.Group();
    const strandCount = strands.length;
    
    console.log('Creating group for', strandCount, 'strands');
    
    // Calculate strand arrangement based on average thickness
    const avgThickness = strands.reduce((sum, s) => sum + (s.thickness || 2.0), 0) / strandCount;
    const baseRadius = 0.09; // Base size for reference
    const arrangeRadius = strandCount > 1 ? avgThickness * (1.1 + Math.min(strandCount, 6) * 0.06) : baseRadius * 0.5;
    
    // Create each strand
    const strandMeshes = strands.map((strand, index) => {
      const angle = (index / Math.max(strandCount, 1)) * Math.PI * 2;
      const offset = {
        y: Math.cos(angle) * arrangeRadius,
        z: Math.sin(angle) * arrangeRadius,
        strandCount
      };
      
      // Calculate radius based on yarn thickness
      const strandRadiusScale = 1 / Math.pow(Math.max(strandCount, 1), 0.2);
      const strandRadius = baseRadius * (strand.thickness || 2.0) / 2.0 * strandRadiusScale; // Slightly thinner plies for higher strand counts
      
      console.log(`Creating strand ${index}:`, { 
        color: strand.color, 
        thickness: strand.thickness,
        radius: strandRadius,
        offset 
      });
      
      // Create twisting strand
      const mesh = this.createTwistingStrand(
        strand.color,
        13.5, // horizontal length
        strandRadius,
        offset,
        strand.twistIntensity || 1.0
      );
      
      console.log(`Strand ${index} created:`, mesh);
      
      return mesh;
    });
    
    // Add all strands to group
    strandMeshes.forEach(mesh => group.add(mesh));

    // Add a subtle visual guide showing flow direction (left -> right).
    const flowGuideMaterial = new THREE.LineDashedMaterial({
      color: 0xb0b0b0,
      dashSize: 0.18,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.75
    });
    const flowGuideGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-6.7, -0.62, -0.9),
      new THREE.Vector3(6.7, -0.62, -0.9)
    ]);
    const flowGuide = new THREE.Line(flowGuideGeometry, flowGuideMaterial);
    flowGuide.computeLineDistances();
    group.add(flowGuide);

    const startDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x6b6b6b })
    );
    startDot.position.set(-6.7, -0.62, -0.9);
    group.add(startDot);

    const endDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );
    endDot.position.set(6.7, -0.62, -0.9);
    group.add(endDot);
    
    // Store strand references
    group.userData.strands = strandMeshes;
    
    this.yarnMesh = group;
    this.scene.add(group);
    
    console.log('Group added to scene. Scene children:', this.scene.children.length);
    console.log('YarnMesh position:', group.position);
    
    // Start twist animation
    this.startTwistAnimation();
  }

  /**
   * Start the twist animation
   */
  startTwistAnimation() {
    this.isAnimating = true;
    this.animationStartTime = Date.now();
  }

  /**
   * Render a single yarn ball
   */
  renderSingleYarn(color, twist = 0.5) {
    if (this.yarnMesh) {
      this.scene.remove(this.yarnMesh);
      this.disposeObject(this.yarnMesh);
    }

    this.yarnMesh = this.createYarnBall(color, 1.5, twist);
    this.scene.add(this.yarnMesh);
  }

  /**
   * Update yarn colors without re-animating
   */
  updateColors(strands) {
    if (!this.yarnMesh || !this.yarnMesh.userData.strands) {
      return;
    }

    const meshes = this.yarnMesh.userData.strands;
    strands.forEach((strand, index) => {
      if (meshes[index]) {
        meshes[index].material.color.set(new THREE.Color(strand.color));
      }
    });
  }

  /**
   * Rebuild strands with new configuration (triggers animation)
   */
  rebuildStrands(strands) {
    this.renderCombinedStrands(strands);
  }

  /**
   * Clear the scene
   */
  clear() {
    if (this.yarnMesh) {
      this.scene.remove(this.yarnMesh);
      this.disposeObject(this.yarnMesh);
      this.yarnMesh = null;
    }
  }

  /**
   * Dispose of Three.js object and free memory
   */
  disposeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => mat.dispose());
      } else {
        object.material.dispose();
      }
    }
    if (object.children) {
      object.children.forEach(child => this.disposeObject(child));
    }
  }

  /**
   * Cleanup and destroy renderer
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.clear();
    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener('resize', () => this.onResize());
  }
}
