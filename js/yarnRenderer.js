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
    this.animationDuration = 2.0; // seconds
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
    
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 12);
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
    
    // Update twist animation if active
    if (this.isAnimating) {
      this.updateTwistAnimation();
    }
    
    // Rotate yarn slowly for continuous animation
    if (this.yarnMesh && !this.isAnimating) {
      this.yarnMesh.rotation.y += 0.005;
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
    
    // Rotate entire group for twisting effect
    if (this.yarnMesh) {
      const maxRotation = Math.PI * 4; // 4 full rotations
      this.yarnMesh.rotation.y = eased * maxRotation;
    }
    
    // Stop animation when complete
    if (progress >= 1.0) {
      this.isAnimating = false;
    }
  }

  /**
   * Update individual strand twist based on animation progress
   */
  updateStrandTwist(strand, progress, strandIndex) {
    const geometry = strand.geometry;
    const positions = geometry.attributes.position.array;
    const initialPositions = strand.userData.initialPositions;
    
    if (!initialPositions) return;
    
    // Calculate twist parameters
    const twistIntensity = strand.userData.twistIntensity || 1.0;
    const currentTwist = progress * twistIntensity * Math.PI * 6;
    
    // Apply twist to each vertex
    for (let i = 0; i < positions.length; i += 3) {
      const x = initialPositions[i];
      const y = initialPositions[i + 1];
      const z = initialPositions[i + 2];
      
      // Calculate twist angle based on y position
      const angle = currentTwist * (y / 3);
      
      // Apply rotation around the vertical axis
      positions[i] = x * Math.cos(angle) - z * Math.sin(angle);
      positions[i + 2] = x * Math.sin(angle) + z * Math.cos(angle);
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
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
      
      const segments = 120;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(segments * 3);
      
      // Store initial positions for animation
      const initialPositions = new Float32Array(segments * 3);
      
      // Create vertical strand with proper helical path for plying
      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        const y = (t - 0.5) * length;
        
        // For multi-strand plying, create helical path around center
        // For single strand, stay mostly straight with minimal wave
        const twistAmount = offset.x === 0 && offset.z === 0 ? 0.5 : 4.0;
        const helixAngle = t * Math.PI * twistAmount;
        const helixRadius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
        
        if (helixRadius > 0.01) {
          // Multiple strands - create helical plying
          const baseAngle = Math.atan2(offset.z, offset.x);
          positions[i * 3] = Math.cos(baseAngle + helixAngle) * helixRadius;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(baseAngle + helixAngle) * helixRadius;
        } else {
          // Single strand - minimal wave to avoid NaN
          const waveRadius = radius * 0.02;
          positions[i * 3] = Math.cos(helixAngle) * waveRadius;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(helixAngle) * waveRadius;
        }
        
        // Store initial positions
        initialPositions[i * 3] = positions[i * 3];
        initialPositions[i * 3 + 1] = positions[i * 3 + 1];
        initialPositions[i * 3 + 2] = positions[i * 3 + 2];
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      console.log('Creating curve with', segments, 'segments');
      
      // Create tube geometry from line
      const points = [];
      for (let i = 0; i < segments; i++) {
        points.push(new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      
      console.log('Creating tube geometry');
      // Reduce segments for better performance and stability
      const tubeGeometry = new THREE.TubeGeometry(curve, 64, radius, 6, false);
      
      console.log('Creating material');
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85,
        metalness: 0.1
      });
      
      console.log('Creating mesh');
      const strand = new THREE.Mesh(tubeGeometry, material);
      
      // Store data for animation
      strand.userData.initialPositions = initialPositions;
      strand.userData.twistIntensity = twistIntensity;
      
      console.log('Adding fiber hairs');
      // Add fiber hairs to strand
      this.addFiberHairsHelix(strand, radius, color);
      
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
    const baseRadius = 0.06; // Base size for reference
    const arrangeRadius = strandCount > 1 ? avgThickness * 0.15 : 0;
    
    // Create each strand
    const strandMeshes = strands.map((strand, index) => {
      const angle = (index / strandCount) * Math.PI * 2;
      const offset = {
        x: Math.cos(angle) * arrangeRadius,
        z: Math.sin(angle) * arrangeRadius
      };
      
      // Calculate radius based on yarn thickness
      const strandRadius = baseRadius * (strand.thickness || 2.0) / 2.0; // Scale relative to worsted weight
      
      console.log(`Creating strand ${index}:`, { 
        color: strand.color, 
        thickness: strand.thickness,
        radius: strandRadius,
        offset 
      });
      
      // Create twisting strand
      const mesh = this.createTwistingStrand(
        strand.color,
        6, // length
        strandRadius,
        offset,
        strand.twistIntensity || 1.0
      );
      
      console.log(`Strand ${index} created:`, mesh);
      
      return mesh;
    });
    
    // Add all strands to group
    strandMeshes.forEach(mesh => group.add(mesh));
    
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
