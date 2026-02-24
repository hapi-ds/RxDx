/**
 * PSP (Project Structure Plan) Matrix store using Zustand
 * Handles fetching, managing, and transforming the multidimensional matrix data
 */

import { create } from 'zustand';
import { apiClient, getErrorMessage } from '../services/api';

// ============================================================================
// Types
// ============================================================================

export interface MatrixPhase {
    id: string;
    name: string;
    description?: string;
    status: string;
}

export interface MatrixDepartment {
    id: string;
    name: string;
    description?: string;
}

export interface MatrixWorkpackage {
    id: string;
    name: string;
    status: string;
    phase_id?: string;
    department_id?: string;
}

export interface PSPMatrixResponse {
    phases: MatrixPhase[];
    departments: MatrixDepartment[];
    workpackages: MatrixWorkpackage[];
}

// Matrix is structured as Record<DepartmentId, Record<PhaseId, MatrixWorkpackage[]>>
export type PSPMatrixGrid = Record<string, Record<string, MatrixWorkpackage[]>>;

// ============================================================================
// State Interface
// ============================================================================

export interface PSPState {
    // Raw Data
    phases: MatrixPhase[];
    departments: MatrixDepartment[];
    workpackages: MatrixWorkpackage[];

    // Computed Matrix Data
    matrixGrid: PSPMatrixGrid;

    // UI State
    isLoading: boolean;
    error: string | null;
    lastFetched: number | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface PSPActions {
    fetchMatrix: (force?: boolean) => Promise<void>;
    clearError: () => void;
    reset: () => void;

    // Helper Selectors
    getWorkpackagesForCell: (departmentId: string, phaseId: string) => MatrixWorkpackage[];
}

export type PSPStore = PSPState & PSPActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: PSPState = {
    phases: [],
    departments: [],
    workpackages: [],
    matrixGrid: {},
    isLoading: false,
    error: null,
    lastFetched: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transforms the flat API payload into the O(1) lookup matrix grid
 */
const computeMatrixGrid = (
    workpackages: MatrixWorkpackage[]
): PSPMatrixGrid => {
    const grid: PSPMatrixGrid = {};

    for (const wp of workpackages) {
        if (!wp.department_id || !wp.phase_id) continue;

        // Initialize Department Row
        if (!grid[wp.department_id]) {
            grid[wp.department_id] = {};
        }

        // Initialize Phase Column for that Department
        if (!grid[wp.department_id][wp.phase_id]) {
            grid[wp.department_id][wp.phase_id] = [];
        }

        // Push the wordpackage into the specific cell
        grid[wp.department_id][wp.phase_id].push(wp);
    }

    return grid;
};

// ============================================================================
// Store Implementation
// ============================================================================

export const usePSPStore = create<PSPStore>()((set, get) => ({
    ...initialState,

    fetchMatrix: async (force = false): Promise<void> => {
        // Basic caching mechanism - don't refetch if fetched in last 5 minutes unless forced
        const { lastFetched, isLoading } = get();
        if (isLoading) return;

        if (!force && lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const response = await apiClient.get<PSPMatrixResponse>('/api/v1/psp/matrix');
            const data = response.data;

            const matrixGrid = computeMatrixGrid(data.workpackages);

            set({
                phases: data.phases,
                departments: data.departments,
                workpackages: data.workpackages,
                matrixGrid,
                isLoading: false,
                lastFetched: Date.now(),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : getErrorMessage(error);
            set({ error: message, isLoading: false });
        }
    },

    clearError: (): void => {
        set({ error: null });
    },

    reset: (): void => {
        set(initialState);
    },

    getWorkpackagesForCell: (departmentId: string, phaseId: string): MatrixWorkpackage[] => {
        const { matrixGrid } = get();
        // Fast O(1) cell lookup utilizing the precomputed grid
        return matrixGrid[departmentId]?.[phaseId] || [];
    },
}));
