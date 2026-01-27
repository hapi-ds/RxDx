/**
 * Common component exports
 */

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Modal, ConfirmModal } from './Modal';
export type { ModalProps, ModalSize, ConfirmModalProps } from './Modal';

export { Input, Select, Textarea, Checkbox } from './Form';
export type { InputProps, SelectProps, SelectOption, TextareaProps, CheckboxProps } from './Form';

export { Table } from './Table';
export type { TableProps, Column, SortDirection } from './Table';

export { Spinner, LoadingOverlay, Skeleton, SkeletonText, LoadingPage } from './Loading';
export type { SpinnerProps, SpinnerSize, LoadingOverlayProps, SkeletonProps, SkeletonTextProps, LoadingPageProps } from './Loading';

export { ErrorMessage, ErrorBoundaryFallback, EmptyState } from './Error';
export type { ErrorMessageProps, ErrorVariant, ErrorBoundaryFallbackProps, EmptyStateProps } from './Error';

export { ProtectedRoute, RoleGate } from './ProtectedRoute';
export { withProtectedRoute } from './withProtectedRoute';

export { NavigationHeader } from './NavigationHeader';
export { navItems } from './NavigationHeader.types';
export type { NavigationHeaderProps, NavItem } from './NavigationHeader.types';

export { PlaceholderPage } from './PlaceholderPage';
export type { PlaceholderPageProps } from './PlaceholderPage';
