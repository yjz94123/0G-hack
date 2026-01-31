/** 快照索引 */
export interface SnapshotIndex {
    snapshotId: string;
    snapshotType: 'full' | 'single_market';
    marketId: string | null;
    ogRootHash: string;
    marketCount: number;
    createdAt: string;
}
/** 健康检查响应 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    services: Record<string, {
        status: string;
        latency?: number;
        lastSync?: string;
    }>;
    sync: {
        totalEvents: number;
        totalMarkets: number;
        activeMarkets: number;
        lastEventSync: string;
        lastOrderBookRefresh: string;
        lastSnapshotUpload: string;
    };
}
//# sourceMappingURL=storage.d.ts.map