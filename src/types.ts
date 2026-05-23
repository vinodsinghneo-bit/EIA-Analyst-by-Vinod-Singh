/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SeriesInfo {
  sk: string;     // Source Key
  desc: string;   // Full Description
  cat: string;    // Category
}

export interface MetricChanges {
  abs: number;
  pct: number | null;
  dir: 'up' | 'dn' | 'fl';
}

export type TabKey =
  | 'stocks'
  | 'refinery'
  | 'refinery_prod'
  | 'production'
  | 'supplied'
  | 'imports'
  | 'exports'
  | 'prices'
  | 'others';
