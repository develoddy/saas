/**
 * Centralized Module Keys Configuration
 * 
 * All MVP module keys are defined here to ensure consistency across:
 * - Routing
 * - Tracking events
 * - Analytics
 * - Admin dashboard
 * 
 * Naming convention:
 * - Landing: <mvp-name>-landing
 * - Wizard: <mvp-name>-wizard
 * - Live: <mvp-name> (clean, without suffix)
 * 
 * @date 2026-02-24
 */

export const MODULE_KEYS = {
  /**
   * Inbox Zero Prevention - Ticket prevention SaaS
   * Validate pain point → Validate solution → Live product
   * 
   * Note: LANDING and LIVE share the same key because they use the same URL.
   * The difference is in module_type column in DB (landing → wizard → live).
   */
  INBOX_ZERO: {
    LANDING: 'inbox-zero-prevention',  // Same as LIVE - differentiated by module_type in DB
    WIZARD: 'inbox-zero-prevention-wizard',
    LIVE: 'inbox-zero-prevention',
    CONCEPT: 'inbox-zero-prevention'  // Base concept name
  },

  /**
   * ProductClip - Video generation from product photos
   * Wizard → Live product (no landing yet)
   */
  PRODUCTCLIP: {
    WIZARD: 'productclip',
    LIVE: 'productclip',
    CONCEPT: 'productclip'
  }
} as const;

/**
 * Type helpers for type-safe module key access
 */
export type ModuleKeyConfig = {
  LANDING?: string;
  WIZARD?: string;
  LIVE?: string;
  CONCEPT: string;
};

export type MvpModuleKeys = typeof MODULE_KEYS;
export type MvpName = keyof MvpModuleKeys;
