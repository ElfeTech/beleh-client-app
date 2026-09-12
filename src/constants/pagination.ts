/** Default page size for most list endpoints (backend max is 100). */
export const DEFAULT_PAGE_SIZE = 20;

/** Preferred page size for workspace/datasource/session lists. */
export const LIST_PAGE_SIZE = 50;

/** Preferred page size for schema/table catalog pages. */
export const TABLES_PAGE_SIZE = 100;

/** Soft ceiling when aggregating pages client-side (LIST_PAGE_SIZE × this). */
export const MAX_LIST_PAGES = 10;

export const INITIAL_PAGE = 1;

/** Show client-side search once a list exceeds this count. */
export const SEARCH_VISIBILITY_THRESHOLD = 10;

/** Hide schema/table catalog search when the browse list is smaller than this. */
export const TABLES_SEARCH_VISIBILITY_THRESHOLD = 5;
