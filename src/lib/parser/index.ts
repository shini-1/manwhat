/**
 * Mihon-inspired Parser Module
 * Web-based manga parsing using CSS selectors
 */

// Export types (interfaces and type aliases)
export type { ParsedHttpSource, SourceSelectors, SourceConfig } from './BaseSource';
export type { SManga, SChapter, Page, MangasPage, ChaptersPage, PagesPage } from './models';
export type { MangaStatus, UpdateStrategy } from './models';

// Export classes and values
export { 
  SMangaImpl, 
  SChapterImpl, 
  PageImpl, 
  MangasPageImpl,
  ChaptersPageImpl,
  PagesPageImpl,
  MangaStatus as MangaStatusValues,
  UpdateStrategy as UpdateStrategyValues
} from './models';

export { getParserSource, getParserSourceIds, getParserSourceNames, parserSources } from './sources';
export { AsuraScansParser, ManganatoParser } from './sources';

