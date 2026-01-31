interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <p className="text-red-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-sm rounded border border-dark-600 text-dark-300 hover:text-white transition"
        >
          Retry
        </button>
      )}
    </div>
  );
}
