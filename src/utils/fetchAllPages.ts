import type { PaginatedResponse } from '../types/api';
import { INITIAL_PAGE, LIST_PAGE_SIZE, MAX_LIST_PAGES } from '../constants/pagination';

/**
 * Fetch successive pages until exhausted or `maxPages` is hit.
 * Prefer UI load-more for unbounded lists; use this for bounded catalogs
 * that need a complete working set (with a safety ceiling).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = LIST_PAGE_SIZE,
  maxPages: number = MAX_LIST_PAGES,
): Promise<T[]> {
  const items: T[] = [];
  let page = INITIAL_PAGE;

  while (page <= maxPages) {
    const response = await fetchPage(page, pageSize);
    items.push(...(response.items ?? []));
    if (!response.has_next) break;
    page += 1;
  }

  return items;
}
