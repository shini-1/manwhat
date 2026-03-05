/**
 * Mihon-inspired Parser Module
 * Web-based manga parsing using CSS selectors
 */

export { ParsedHttpSource, SourceSelectors, SourceConfig } from './BaseSource';

export { 
  SMangaImpl, 
  SChapterImpl, 
  PageImpl, 
  MangasPageImpl,
  ChaptersPageImpl,
  PagesPageImpl,
  MangaStatus,
  UpdateStrategy 
} from './models';

export { getParserSource, getParserSourceIds, getParserSourceNames, parserSources } from './sources';
export { AsuraScansParser, ManganatoParser } from './sources';

