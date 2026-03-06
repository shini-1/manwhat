/**
 * Parser Sources Index - Mihon-inspired source registry
 */

import type { ParsedHttpSource } from '../BaseSource';
import { AsuraScansParser } from './AsuraScansParser';
import { ManganatoParser } from './ManganatoParser';

/**
 * Available parser sources
 */
export const parserSources: ParsedHttpSource[] = [
  new AsuraScansParser(),
  new ManganatoParser(),
];

/**
 * Get a parser source by ID
 */
export function getParserSource(sourceId: string): ParsedHttpSource | undefined {
  return parserSources.find(s => s.id === sourceId);
}

/**
 * Get all available source IDs
 */
export function getParserSourceIds(): string[] {
  return parserSources.map(s => s.id);
}

/**
 * Get all available source names
 */
export function getParserSourceNames(): Array<{ id: string; name: string; baseUrl: string }> {
  return parserSources.map(s => ({ id: s.id, name: s.name, baseUrl: s.baseUrl }));
}

// Re-export parsers
export { AsuraScansParser } from './AsuraScansParser';
export { ManganatoParser } from './ManganatoParser';

