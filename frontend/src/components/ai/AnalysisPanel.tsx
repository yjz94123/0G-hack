import { useTriggerAnalysis, useAnalyses } from '../../hooks';
import { Loading } from '../common';

interface AnalysisPanelProps {
  eventId: string;
  marketId: string;
}

export function AnalysisPanel({ eventId, marketId }: AnalysisPanelProps) {
  const { data: analysesData, isLoading } = useAnalyses(eventId, marketId);
  const triggerMutation = useTriggerAnalysis();

  const analyses = analysesData?.data || [];

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-dark-300">AI Analysis</h3>
        <button
          onClick={() => triggerMutation.mutate({ eventId, marketId })}
          disabled={triggerMutation.isPending}
          className="px-3 py-1 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 transition"
        >
          {triggerMutation.isPending ? 'Analyzing...' : 'New Analysis'}
        </button>
      </div>

      {/* Powered by 0G */}
      <p className="text-xs text-dark-600 mb-3">Powered by 0G Compute Network</p>

      {isLoading ? (
        <Loading size="sm" />
      ) : analyses.length === 0 ? (
        <p className="text-sm text-dark-500 text-center py-4">
          No analysis yet. Click "New Analysis" to get AI insights.
        </p>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <div
              key={analysis.taskId}
              className="p-3 rounded-lg bg-dark-800 border border-dark-700"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    analysis.status === 'completed'
                      ? 'bg-green-500/10 text-green-400'
                      : analysis.status === 'failed'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {analysis.status}
                </span>
                <span className="text-dark-500">{analysis.createdAt}</span>
              </div>
              {analysis.reasoning && (
                <div className="text-sm text-dark-300">
                  <p>{analysis.reasoning}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
