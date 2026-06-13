type PaginationResult = {
  limit: number;
  offset: number;
  page: number;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export const parsePagination = (query: Record<string, unknown>): PaginationResult | null => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);
  const normalizedLimit = Math.min(limit, MAX_LIMIT);

  if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1) {
    return null;
  }

  return {
    page,
    limit: normalizedLimit,
    offset: (page - 1) * normalizedLimit,
  };
};

export const buildPaginationMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});
