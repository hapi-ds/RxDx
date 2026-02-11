/**
 * Layout Animator
 * Handles smooth transitions between layout positions
 */

export interface AnimatedNode {
  id: string;
  x: number;
  y: number;
}

export interface AnimationConfig {
  duration: number; // milliseconds
  easing: (t: number) => number;
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number; // 0 to 1
  startTime: number;
  endTime: number;
}

/**
 * Easing functions for animations
 */
export const EasingFunctions = {
  /**
   * Ease-in-out cubic function
   * Starts slow, speeds up in the middle, slows down at the end
   */
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * Linear easing (no easing)
   */
  linear: (t: number): number => {
    return t;
  },

  /**
   * Ease-in quadratic
   */
  easeIn: (t: number): number => {
    return t * t;
  },

  /**
   * Ease-out quadratic
   */
  easeOut: (t: number): number => {
    return 1 - (1 - t) * (1 - t);
  },
};

/**
 * LayoutAnimator manages smooth transitions between node positions
 */
export class LayoutAnimator {
  private fromPositions: Map<string, { x: number; y: number }> = new Map();
  private toPositions: Map<string, { x: number; y: number }> = new Map();
  private currentPositions: Map<string, { x: number; y: number }> = new Map();
  private animationState: AnimationState = {
    isAnimating: false,
    progress: 0,
    startTime: 0,
    endTime: 0,
  };
  private animationFrameId: number | null = null;
  private config: AnimationConfig;
  private onUpdate: ((positions: Map<string, { x: number; y: number }>) => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(config?: Partial<AnimationConfig>) {
    this.config = {
      duration: 500, // Default 500ms
      easing: EasingFunctions.easeInOutCubic,
      ...config,
    };
  }

  /**
   * Start animating from current positions to target positions
   */
  public animate(
    fromNodes: AnimatedNode[],
    toNodes: AnimatedNode[],
    onUpdate: (positions: Map<string, { x: number; y: number }>) => void,
    onComplete?: () => void
  ): void {
    // Cancel any existing animation
    this.stop();

    // Store positions
    this.fromPositions.clear();
    this.toPositions.clear();
    this.currentPositions.clear();

    fromNodes.forEach((node) => {
      this.fromPositions.set(node.id, { x: node.x, y: node.y });
      this.currentPositions.set(node.id, { x: node.x, y: node.y });
    });

    toNodes.forEach((node) => {
      this.toPositions.set(node.id, { x: node.x, y: node.y });
    });

    // Set callbacks
    this.onUpdate = onUpdate;
    this.onComplete = onComplete || null;

    // Initialize animation state
    const now = performance.now();
    this.animationState = {
      isAnimating: true,
      progress: 0,
      startTime: now,
      endTime: now + this.config.duration,
    };

    // Start animation loop
    this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Animation tick - updates positions based on elapsed time
   */
  private tick(timestamp: number): void {
    if (!this.animationState.isAnimating) {
      return;
    }

    // Calculate progress (0 to 1)
    const elapsed = timestamp - this.animationState.startTime;
    const rawProgress = Math.min(elapsed / this.config.duration, 1);
    const easedProgress = this.config.easing(rawProgress);

    this.animationState.progress = easedProgress;

    // Interpolate positions
    this.fromPositions.forEach((fromPos, nodeId) => {
      const toPos = this.toPositions.get(nodeId);
      if (toPos) {
        const x = fromPos.x + (toPos.x - fromPos.x) * easedProgress;
        const y = fromPos.y + (toPos.y - fromPos.y) * easedProgress;
        this.currentPositions.set(nodeId, { x, y });
      }
    });

    // Call update callback
    if (this.onUpdate) {
      this.onUpdate(new Map(this.currentPositions));
    }

    // Check if animation is complete
    if (rawProgress >= 1) {
      this.complete();
    } else {
      // Continue animation
      this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
    }
  }

  /**
   * Complete the animation
   */
  private complete(): void {
    this.animationState.isAnimating = false;
    this.animationState.progress = 1;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Ensure final positions are exact
    this.toPositions.forEach((toPos, nodeId) => {
      this.currentPositions.set(nodeId, { x: toPos.x, y: toPos.y });
    });

    // Call update one final time with exact positions
    if (this.onUpdate) {
      this.onUpdate(new Map(this.currentPositions));
    }

    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Stop the current animation
   */
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animationState.isAnimating = false;
  }

  /**
   * Check if animation is currently running
   */
  public isAnimating(): boolean {
    return this.animationState.isAnimating;
  }

  /**
   * Get current animation progress (0 to 1)
   */
  public getProgress(): number {
    return this.animationState.progress;
  }

  /**
   * Get current positions
   */
  public getCurrentPositions(): Map<string, { x: number; y: number }> {
    return new Map(this.currentPositions);
  }

  /**
   * Update animation configuration
   */
  public setConfig(config: Partial<AnimationConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get animation duration
   */
  public getDuration(): number {
    return this.config.duration;
  }
}
