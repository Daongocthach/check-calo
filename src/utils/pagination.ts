export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface PageRequest {
  page?: number;
  pageSize?: number;
}
