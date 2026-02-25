/**
 * TypeScript Interfaces for MVP Architecture
 * 
 * Defines types for modules, phases, and configurations
 * used across the MVP validation system.
 * 
 * @date 2026-02-24
 */

/**
 * MVP Phase Configuration
 * Data structure for route configuration per phase
 */
export interface MvpPhaseConfig {
  moduleKey: string;
  title: string;
  description: string;
  icon?: string;
  color?: string;
}

/**
 * Complete MVP Module Structure
 * Defines which phases are available for an MVP
 */
export interface MvpModule {
  landing?: MvpPhaseConfig;
  wizard?: MvpPhaseConfig;
  live?: MvpPhaseConfig;
}

/**
 * MVP Phase Type
 * Enumeration of possible phases
 */
export type MvpPhase = 'landing' | 'wizard' | 'live';

/**
 * MVP Status
 * Matches backend module status enum
 */
export type MvpStatus = 'draft' | 'testing' | 'live' | 'archived';

/**
 * Tracking Event Base Interface
 * Common structure for all tracking events
 */
export interface TrackingEvent {
  event: string;
  module: string;
  moduleName?: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics KPI Interface
 * Minimal interface for analytics data (full definition in services)
 */
export interface MvpKpi {
  moduleKey: string;
  moduleName: string;
  moduleType: 'landing' | 'wizard' | 'live';
  healthScore: number;
  status: MvpStatus;
}
