import type { User } from '../../stores/authStore';

export interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

export interface NavigationHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const navItems: NavItem[] = [
  { path: '/requirements', label: 'Requirements', icon: '📋' },
  { path: '/graph', label: 'Graph', icon: '🔗' },
  { path: '/tests', label: 'Tests', icon: '🧪' },
  { path: '/risks', label: 'Risks', icon: '⚠️' },
  { path: '/schedule', label: 'Schedule', icon: '📅' },
  { path: '/kanban', label: 'Kanban', icon: '📊' },
  { path: '/documents', label: 'Documents', icon: '📄' },
];