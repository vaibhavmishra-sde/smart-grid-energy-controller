export function parsePagination(query, maxLimit) {
  const limit = Number(query.limit ?? 100);
  const offset = Number(query.offset ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return { error: `limit must be an integer between 1 and ${maxLimit}` };
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    return { error: 'offset must be an integer between 0 and 1000000' };
  }
  return { limit, offset };
}
