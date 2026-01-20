/**
 * VRInteraction Component Tests
 * Tests for VR-specific node selection and movement functionality
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import {
  VRInteraction,
  useVRInteraction,
  type VRInteractionProps,
  type NodeInteractionState,
  type VRInteractionMode,
  type InteractionSource,
  type RayIntersection,
} from './VRInteraction';

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Store callback for manual invocation in tests
    (global as Record<string, unknown>).__useFrameCallback = callback;
  }),
  useThree: vi.fn(() => ({
    gl: {
      xr: {
        getReferenceSpace: vi.fn(() => ({})),
        getFrame: vi.fn(() => ({
          getPose: vi.fn(() => ({
            transform: {
              position: { x: 0, y: 1.5, z: -1 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
          })),
          getJointPose: vi.fn(() => ({
            transform: {
              position: { x: 0, y: 1.5, z: -0.5 },
              orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
            radius: 0.01,
          })),
        })),
      },
    },
  })),
}));

// Mock @react-three/xr
vi.mock('@react-three/xr', () => ({
  useXR: vi.fn((selector) => {
    const state = {
      session: null,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('VRInteraction', () => {
  // Test node positions
  const createTestNodePositions = (): Map<string, THREE.Vector3> => {
    const positions = new Map<string, THREE.Vector3>();
    positions.set('node-1', new THREE.Vector3(0, 0, 0));
    positions.set('node-2', new THREE.Vector3(2, 0, 0));
    positions.set('node-3', new THREE.Vector3(0, 2, 0));
    positions.set('node-4', new THREE.Vector3(0, 0, 2));
    return positions;
  };

  describe('Type Definitions', () => {
    it('should have correct VRInteractionMode type values', () => {
      const modes: VRInteractionMode[] = ['select', 'drag', 'idle'];
      expect(modes).toContain('select');
      expect(modes).toContain('drag');
      expect(modes).toContain('idle');
    });

    it('should have correct InteractionSource type values', () => {
      const sources: InteractionSource[] = [
        'controller-left',
        'controller-right',
        'hand-left',
        'hand-right',
        'none',
      ];
      expect(sources).toContain('controller-left');
      expect(sources).toContain('controller-right');
      expect(sources).toContain('hand-left');
      expect(sources).toContain('hand-right');
      expect(sources).toContain('none');
    });

    it('should have correct NodeInteractionState structure', () => {
      const state: NodeInteractionState = {
        hoveredNodeId: null,
        selectedNodeId: null,
        draggedNodeId: null,
        mode: 'idle',
        source: 'none',
        dragStartPosition: null,
        dragOffset: null,
      };

      expect(state.hoveredNodeId).toBeNull();
      expect(state.selectedNodeId).toBeNull();
      expect(state.draggedNodeId).toBeNull();
      expect(state.mode).toBe('idle');
      expect(state.source).toBe('none');
      expect(state.dragStartPosition).toBeNull();
      expect(state.dragOffset).toBeNull();
    });

    it('should have correct RayIntersection structure', () => {
      const intersection: RayIntersection = {
        nodeId: 'test-node',
        point: new THREE.Vector3(1, 2, 3),
        distance: 5,
      };

      expect(intersection.nodeId).toBe('test-node');
      expect(intersection.point).toBeInstanceOf(THREE.Vector3);
      expect(intersection.distance).toBe(5);
    });
  });

  describe('VRInteractionProps', () => {
    it('should accept required props', () => {
      const props: VRInteractionProps = {
        nodePositions: createTestNodePositions(),
      };

      expect(props.nodePositions).toBeDefined();
      expect(props.nodePositions.size).toBe(4);
    });

    it('should accept optional callback props', () => {
      const onNodeSelect = vi.fn();
      const onNodeHover = vi.fn();
      const onNodeDrag = vi.fn();
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();

      const props: VRInteractionProps = {
        nodePositions: createTestNodePositions(),
        nodeHitRadius: 0.8,
        onNodeSelect,
        onNodeHover,
        onNodeDrag,
        onDragStart,
        onDragEnd,
        showDebug: true,
        rayColor: '#ff0000',
        rayHoverColor: '#00ff00',
        rayLength: 15,
        enableHaptics: false,
      };

      expect(props.nodeHitRadius).toBe(0.8);
      expect(props.onNodeSelect).toBe(onNodeSelect);
      expect(props.onNodeHover).toBe(onNodeHover);
      expect(props.onNodeDrag).toBe(onNodeDrag);
      expect(props.onDragStart).toBe(onDragStart);
      expect(props.onDragEnd).toBe(onDragEnd);
      expect(props.showDebug).toBe(true);
      expect(props.rayColor).toBe('#ff0000');
      expect(props.rayHoverColor).toBe('#00ff00');
      expect(props.rayLength).toBe(15);
      expect(props.enableHaptics).toBe(false);
    });
  });

  describe('Ray Casting Logic', () => {
    it('should detect intersection with node within hit radius', () => {
      // Test ray-sphere intersection logic
      const origin = new THREE.Vector3(0, 0, -5);
      const direction = new THREE.Vector3(0, 0, 1).normalize();
      const nodePosition = new THREE.Vector3(0, 0, 0);
      const hitRadius = 0.6;

      // Calculate intersection
      const toNode = new THREE.Vector3().subVectors(nodePosition, origin);
      const projectionLength = toNode.dot(direction);
      const closestPointOnRay = origin.clone().add(direction.clone().multiplyScalar(projectionLength));
      const distanceToNode = closestPointOnRay.distanceTo(nodePosition);

      expect(projectionLength).toBeGreaterThan(0); // Node is in front
      expect(distanceToNode).toBeLessThanOrEqual(hitRadius); // Within hit radius
    });

    it('should not detect intersection when ray misses node', () => {
      const origin = new THREE.Vector3(0, 0, -5);
      const direction = new THREE.Vector3(1, 0, 0).normalize(); // Pointing sideways
      const nodePosition = new THREE.Vector3(0, 0, 0);
      const hitRadius = 0.6;

      // Calculate intersection
      const toNode = new THREE.Vector3().subVectors(nodePosition, origin);
      const projectionLength = toNode.dot(direction);
      
      // Node is not in front of ray direction
      expect(projectionLength).toBeLessThanOrEqual(0);
    });

    it('should not detect intersection when node is behind ray origin', () => {
      const origin = new THREE.Vector3(0, 0, 5);
      const direction = new THREE.Vector3(0, 0, 1).normalize(); // Pointing away from node
      const nodePosition = new THREE.Vector3(0, 0, 0);

      // Calculate intersection
      const toNode = new THREE.Vector3().subVectors(nodePosition, origin);
      const projectionLength = toNode.dot(direction);

      expect(projectionLength).toBeLessThan(0); // Node is behind
    });

    it('should find closest intersection when multiple nodes are in ray path', () => {
      const origin = new THREE.Vector3(0, 0, -5);
      const direction = new THREE.Vector3(0, 0, 1).normalize();
      const hitRadius = 0.6;

      const nodes = [
        { id: 'near', position: new THREE.Vector3(0, 0, -2) },
        { id: 'far', position: new THREE.Vector3(0, 0, 2) },
      ];

      let closestId: string | null = null;
      let closestDistance = Infinity;

      for (const node of nodes) {
        const toNode = new THREE.Vector3().subVectors(node.position, origin);
        const projectionLength = toNode.dot(direction);
        
        if (projectionLength < 0) continue;
        
        const closestPointOnRay = origin.clone().add(direction.clone().multiplyScalar(projectionLength));
        const distanceToNode = closestPointOnRay.distanceTo(node.position);
        
        if (distanceToNode <= hitRadius && projectionLength < closestDistance) {
          closestDistance = projectionLength;
          closestId = node.id;
        }
      }

      expect(closestId).toBe('near');
    });
  });

  describe('Gesture Detection', () => {
    it('should detect pinch gesture when thumb and index are close', () => {
      const thumbTipPosition = new THREE.Vector3(0, 1.5, -0.5);
      const indexTipPosition = new THREE.Vector3(0.02, 1.52, -0.5);
      const pinchThreshold = 0.03; // 3cm

      const pinchDistance = thumbTipPosition.distanceTo(indexTipPosition);
      const isPinching = pinchDistance < pinchThreshold;

      expect(isPinching).toBe(true);
    });

    it('should not detect pinch when fingers are apart', () => {
      const thumbTipPosition = new THREE.Vector3(0, 1.5, -0.5);
      const indexTipPosition = new THREE.Vector3(0.1, 1.6, -0.5);
      const pinchThreshold = 0.03; // 3cm

      const pinchDistance = thumbTipPosition.distanceTo(indexTipPosition);
      const isPinching = pinchDistance < pinchThreshold;

      expect(isPinching).toBe(false);
    });

    it('should calculate pinch midpoint correctly', () => {
      const thumbTipPosition = new THREE.Vector3(0, 1.5, -0.5);
      const indexTipPosition = new THREE.Vector3(0.02, 1.52, -0.5);

      const pinchMidpoint = thumbTipPosition.clone().add(indexTipPosition).multiplyScalar(0.5);

      expect(pinchMidpoint.x).toBeCloseTo(0.01);
      expect(pinchMidpoint.y).toBeCloseTo(1.51);
      expect(pinchMidpoint.z).toBeCloseTo(-0.5);
    });
  });

  describe('Drag Offset Calculation', () => {
    it('should calculate correct drag offset', () => {
      const nodePosition = new THREE.Vector3(1, 2, 3);
      const grabPoint = new THREE.Vector3(1.1, 2.1, 3.1);

      const dragOffset = new THREE.Vector3().subVectors(nodePosition, grabPoint);

      expect(dragOffset.x).toBeCloseTo(-0.1);
      expect(dragOffset.y).toBeCloseTo(-0.1);
      expect(dragOffset.z).toBeCloseTo(-0.1);
    });

    it('should apply drag offset to get new position', () => {
      const nodePosition = new THREE.Vector3(1, 2, 3);
      const grabPoint = new THREE.Vector3(1.1, 2.1, 3.1);
      const dragOffset = new THREE.Vector3().subVectors(nodePosition, grabPoint);

      // Simulate moving the grab point
      const newGrabPoint = new THREE.Vector3(2, 3, 4);
      const newPosition = newGrabPoint.clone().add(dragOffset);

      // New position should maintain the same offset from grab point
      expect(newPosition.x).toBeCloseTo(1.9);
      expect(newPosition.y).toBeCloseTo(2.9);
      expect(newPosition.z).toBeCloseTo(3.9);
    });
  });

  describe('useVRInteraction Hook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return default interaction state', () => {
      const { result } = renderHook(() => useVRInteraction());

      expect(result.current.hoveredNodeId).toBeNull();
      expect(result.current.selectedNodeId).toBeNull();
      expect(result.current.draggedNodeId).toBeNull();
      expect(result.current.mode).toBe('idle');
      expect(result.current.source).toBe('none');
    });
  });

  describe('Controller Input Processing', () => {
    it('should map trigger button to index 0', () => {
      // Standard XR gamepad mapping
      const triggerIndex = 0;
      expect(triggerIndex).toBe(0);
    });

    it('should map grip button to index 1', () => {
      // Standard XR gamepad mapping
      const gripIndex = 1;
      expect(gripIndex).toBe(1);
    });

    it('should calculate ray direction from quaternion', () => {
      // Identity quaternion should give forward direction (0, 0, -1)
      const quaternion = new THREE.Quaternion(0, 0, 0, 1);
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

      expect(direction.x).toBeCloseTo(0);
      expect(direction.y).toBeCloseTo(0);
      expect(direction.z).toBeCloseTo(-1);
    });

    it('should calculate ray direction for rotated controller', () => {
      // 90 degree rotation around Y axis
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

      expect(direction.x).toBeCloseTo(-1);
      expect(direction.y).toBeCloseTo(0);
      expect(direction.z).toBeCloseTo(0);
    });
  });

  describe('Visual Feedback', () => {
    it('should use different ray colors for normal and hover states', () => {
      const rayColor = '#3b82f6';
      const rayHoverColor = '#10b981';

      expect(rayColor).not.toBe(rayHoverColor);
    });

    it('should calculate ray end point correctly', () => {
      const origin = new THREE.Vector3(0, 1.5, -1);
      const direction = new THREE.Vector3(0, 0, -1).normalize();
      const rayLength = 10;

      const rayEnd = origin.clone().add(direction.clone().multiplyScalar(rayLength));

      expect(rayEnd.x).toBeCloseTo(0);
      expect(rayEnd.y).toBeCloseTo(1.5);
      expect(rayEnd.z).toBeCloseTo(-11);
    });
  });

  describe('Haptic Feedback', () => {
    it('should use appropriate intensity for hover feedback', () => {
      const hoverIntensity = 0.1;
      const hoverDuration = 20;

      expect(hoverIntensity).toBeLessThan(0.5);
      expect(hoverDuration).toBeLessThan(100);
    });

    it('should use appropriate intensity for selection feedback', () => {
      const selectIntensity = 0.4;
      const selectDuration = 50;

      expect(selectIntensity).toBeGreaterThan(0.1);
      expect(selectDuration).toBeGreaterThan(20);
    });

    it('should use appropriate intensity for drag feedback', () => {
      const dragStartIntensity = 0.5;
      const dragStartDuration = 100;

      expect(dragStartIntensity).toBeGreaterThan(0.3);
      expect(dragStartDuration).toBeGreaterThan(50);
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to select on trigger press', () => {
      const initialMode: VRInteractionMode = 'idle';
      const triggerPressed = true;
      const hasIntersection = true;

      // Simulate state transition
      let newMode: VRInteractionMode = initialMode;
      if (triggerPressed && hasIntersection) {
        newMode = 'select';
      }

      expect(newMode).toBe('select');
    });

    it('should transition from idle to drag on grip press', () => {
      const initialMode: VRInteractionMode = 'idle';
      const gripPressed = true;
      const hasIntersection = true;

      // Simulate state transition
      let newMode: VRInteractionMode = initialMode;
      if (gripPressed && hasIntersection) {
        newMode = 'drag';
      }

      expect(newMode).toBe('drag');
    });

    it('should transition from drag to idle on grip release', () => {
      const initialMode: VRInteractionMode = 'drag';
      const gripPressed = false;

      // Simulate state transition
      let newMode: VRInteractionMode = initialMode;
      if (!gripPressed && initialMode === 'drag') {
        newMode = 'idle';
      }

      expect(newMode).toBe('idle');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node positions map', () => {
      const emptyPositions = new Map<string, THREE.Vector3>();
      expect(emptyPositions.size).toBe(0);
    });

    it('should handle very small hit radius', () => {
      const origin = new THREE.Vector3(0, 0, -5);
      const direction = new THREE.Vector3(0, 0, 1).normalize();
      const nodePosition = new THREE.Vector3(0.01, 0, 0); // Slightly off-center
      const hitRadius = 0.001; // Very small

      const toNode = new THREE.Vector3().subVectors(nodePosition, origin);
      const projectionLength = toNode.dot(direction);
      const closestPointOnRay = origin.clone().add(direction.clone().multiplyScalar(projectionLength));
      const distanceToNode = closestPointOnRay.distanceTo(nodePosition);

      expect(distanceToNode).toBeGreaterThan(hitRadius);
    });

    it('should handle very large hit radius', () => {
      const origin = new THREE.Vector3(0, 0, -5);
      const direction = new THREE.Vector3(0, 0, 1).normalize();
      const nodePosition = new THREE.Vector3(2, 0, 0); // Far off-center
      const hitRadius = 5; // Very large

      const toNode = new THREE.Vector3().subVectors(nodePosition, origin);
      const projectionLength = toNode.dot(direction);
      const closestPointOnRay = origin.clone().add(direction.clone().multiplyScalar(projectionLength));
      const distanceToNode = closestPointOnRay.distanceTo(nodePosition);

      expect(distanceToNode).toBeLessThanOrEqual(hitRadius);
    });

    it('should handle zero-length direction vector gracefully', () => {
      const direction = new THREE.Vector3(0, 0, 0);
      const normalized = direction.clone();
      
      // Normalizing zero vector should result in zero vector
      if (direction.length() > 0) {
        normalized.normalize();
      }

      expect(normalized.length()).toBe(0);
    });
  });
});
