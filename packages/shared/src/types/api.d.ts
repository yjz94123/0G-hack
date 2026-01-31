/** 通用 API 响应 */
export interface ApiResponse<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
    storageProvider?: string;
}
/** API 错误响应 */
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
    };
}
/** 分页元信息 */
export interface PaginationMeta {
    total: number;
    limit: number;
    offset: number;
}
/** 排序方向 */
export type SortOrder = 'asc' | 'desc';
/** 市场排序字段 */
export type MarketSortBy = 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';
//# sourceMappingURL=api.d.ts.map