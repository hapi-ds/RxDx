/**
 * Navigation types for React Navigation
 */

import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {StackScreenProps} from '@react-navigation/stack';
import type {Task} from './index';

/**
 * Auth Stack parameter list
 */
export type AuthStackParamList = {
  Login: undefined;
};

/**
 * Main Tab parameter list
 */
export type MainTabParamList = {
  Tasks: undefined;
  History: undefined;
  Settings: undefined;
};

/**
 * Main Stack parameter list
 */
export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  TimeTracking: {
    task: Task;
  };
};

/**
 * Root Stack parameter list
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

/**
 * Auth Stack screen props
 */
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  StackScreenProps<AuthStackParamList, T>;

/**
 * Main Tab screen props
 */
export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    StackScreenProps<MainStackParamList>
  >;

/**
 * Main Stack screen props
 */
export type MainStackScreenProps<T extends keyof MainStackParamList> =
  StackScreenProps<MainStackParamList, T>;

/**
 * Root Stack screen props
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
