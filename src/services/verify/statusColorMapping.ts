/**
 * GRADIFI VERIFY - CANONICAL UI STATUS COLOR MAPPING
 * Enforces unified semantic color mapping across provider cards, verification matrix,
 * evidence panel, and examiner dashboard.
 * HOEOS Standard: Truthful visual state representation, ZERO false green indicators.
 */

import { FineGrainedProviderStatus } from './types';

export interface StatusStyle {
  colorName: 'green' | 'amber' | 'neutral' | 'red';
  badgeBgClass: string;
  badgeTextClass: string;
  dotBgClass: string;
  label: string;
}

export function getStatusStyle(status: FineGrainedProviderStatus | string): StatusStyle {
  switch (status) {
    case 'VERIFIED':
      return {
        colorName: 'green',
        badgeBgClass: 'bg-emerald-500/10 border-emerald-500/30',
        badgeTextClass: 'text-emerald-400',
        dotBgClass: 'bg-emerald-400',
        label: 'Verified'
      };
    case 'INFERENCE_VERIFIED':
      return {
        colorName: 'green',
        badgeBgClass: 'bg-emerald-500/10 border-emerald-500/30',
        badgeTextClass: 'text-emerald-400',
        dotBgClass: 'bg-emerald-400',
        label: 'Inference Verified'
      };

    case 'EMPTY_RESULT':
      return {
        colorName: 'amber',
        badgeBgClass: 'bg-amber-500/10 border-amber-500/30',
        badgeTextClass: 'text-amber-400',
        dotBgClass: 'bg-amber-400',
        label: 'Empty Result'
      };
    case 'PARTIALLY_VERIFIED':
      return {
        colorName: 'amber',
        badgeBgClass: 'bg-amber-500/10 border-amber-500/30',
        badgeTextClass: 'text-amber-400',
        dotBgClass: 'bg-amber-400',
        label: 'Partially Verified'
      };

    case 'NOT_TESTED':
    case 'NOT_APPLICABLE':
      return {
        colorName: 'neutral',
        badgeBgClass: 'bg-slate-500/10 border-slate-500/30',
        badgeTextClass: 'text-slate-400',
        dotBgClass: 'bg-slate-400',
        label: 'Not Tested'
      };

    case 'AUTHENTICATION_FAILED':
      return {
        colorName: 'red',
        badgeBgClass: 'bg-rose-500/10 border-rose-500/30',
        badgeTextClass: 'text-rose-400',
        dotBgClass: 'bg-rose-400',
        label: 'Auth Failed'
      };
    case 'REQUEST_FAILED':
      return {
        colorName: 'red',
        badgeBgClass: 'bg-rose-500/10 border-rose-500/30',
        badgeTextClass: 'text-rose-400',
        dotBgClass: 'bg-rose-400',
        label: 'Request Failed'
      };
    case 'SCHEMA_FAILED':
      return {
        colorName: 'red',
        badgeBgClass: 'bg-rose-500/10 border-rose-500/30',
        badgeTextClass: 'text-rose-400',
        dotBgClass: 'bg-rose-400',
        label: 'Schema Failed'
      };
    case 'RUNTIME_UNAVAILABLE':
      return {
        colorName: 'red',
        badgeBgClass: 'bg-rose-500/10 border-rose-500/30',
        badgeTextClass: 'text-rose-400',
        dotBgClass: 'bg-rose-400',
        label: 'Runtime Unavailable'
      };
    case 'INFERENCE_FAILED':
      return {
        colorName: 'red',
        badgeBgClass: 'bg-rose-500/10 border-rose-500/30',
        badgeTextClass: 'text-rose-400',
        dotBgClass: 'bg-rose-400',
        label: 'Inference Failed'
      };

    default:
      return {
        colorName: 'neutral',
        badgeBgClass: 'bg-slate-500/10 border-slate-500/30',
        badgeTextClass: 'text-slate-400',
        dotBgClass: 'bg-slate-400',
        label: String(status)
      };
  }
}
