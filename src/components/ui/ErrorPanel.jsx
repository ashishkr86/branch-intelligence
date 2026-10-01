import { AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "./primitives";

/**
 * ErrorPanel — displayed when an API call fails.
 */
export function ErrorPanel({ message, onRetry }) {
  return (
    <Card className="border-err/30 bg-err/5 p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-err/10 text-err">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-md font-semibold text-ink">Failed to load data</h3>
      <p className="mx-auto mt-2 max-w-md text-xs text-ink-soft">
        {message || "The API is not responding. Make sure the backend is running on port 8000."}
      </p>
      <div className="mt-4 rounded-lg border border-line bg-bg px-4 py-2 text-left text-2xs text-ink-mute">
        <div className="font-semibold text-ink-soft">Try this:</div>
        <div className="mt-1 font-mono">cd backend</div>
        <div className="font-mono">python -m uvicorn main:app --reload --port 8000</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-err px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </Card>
  );
}