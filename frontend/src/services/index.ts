/**
 * Service exports
 */

export { apiClient, getErrorMessage, isApiError } from './api';
export type { ApiError, ApiResponse } from './api';

export { authService } from './authService';
export type {
  LoginRequest,
  LoginResponse,
  UserResponse,
  RefreshTokenResponse,
} from './authService';

export { workitemService } from './workitemService';
export type {
  WorkItem,
  WorkItemCreate,
  WorkItemUpdate,
  WorkItemListParams,
  WorkItemListResponse,
  WorkItemType,
  WorkItemStatus,
  VersionHistoryItem,
} from './workitemService';

export { graphService } from './graphService';
export type {
  GraphNode,
  GraphEdge,
  GraphData,
  GraphVisualizationParams,
  TraceabilityMatrixItem,
  RiskChain,
} from './graphService';

export * as riskService from './riskService';
export type {
  RiskNode,
  RiskNodeCreate,
  RiskNodeUpdate,
  RiskStatus,
  MitigationAction,
  MitigationStatus,
  FailureNode,
  FailureType,
  RiskChain as RiskFailureChain,
  RPNAnalysis,
  RiskListResponse,
  MitigationListResponse,
  RiskFilters,
} from './riskService';

export { scheduleService } from './scheduleService';
export type {
  Task,
  Resource,
  ScheduleConstraints,
  ScheduledTask,
  ScheduleResult,
  ScheduleFilters,
  ScheduleStatistics,
} from './scheduleService';

export * as testService from './testService';
export type {
  TestSpec,
  TestSpecCreate,
  TestSpecUpdate,
  TestRun,
  TestRunCreate,
  TestRunUpdate,
  TestCoverage,
  TestSpecListResponse,
  TestRunListResponse,
  TestFilters,
  TestType,
  ExecutionStatus,
  StepExecutionStatus,
  TestStep,
} from './testService';
