import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [60, 90, 120, 180] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RestTimer() {
  const [duration, setDuration] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (!isRunning || remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsComplete(true);
          // Vibrate if available
          if (navigator.vibrate) navigator.vibrate(200);
          // Auto-dismiss after 3 seconds
          dismissRef.current = setTimeout(() => {
            setDuration(null);
            setIsComplete(false);
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining]);

  const startTimer = (seconds: number) => {
    cleanup();
    setDuration(seconds);
    setRemaining(seconds);
    setIsRunning(true);
    setIsComplete(false);
  };

  const togglePause = () => setIsRunning((r) => !r);

  const reset = () => {
    cleanup();
    if (duration) {
      setRemaining(duration);
      setIsRunning(false);
      setIsComplete(false);
    }
  };

  const dismiss = () => {
    cleanup();
    setDuration(null);
    setRemaining(0);
    setIsRunning(false);
    setIsComplete(false);
  };

  // Preset selection
  if (duration === null) {
    return (
      <div className="flex items-center gap-2 py-3 animate-in slide-in-from-top-2 duration-200">
        <Timer className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-1">Rest:</span>
        {PRESETS.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => startTimer(s)}
          >
            {formatTime(s)}
          </Button>
        ))}
      </div>
    );
  }

  // Active timer
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4 py-3 animate-in slide-in-from-top-2 duration-200">
      {/* Circular progress */}
      <div
        className="relative w-16 h-16 shrink-0"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${progress * 3.6}deg, hsl(var(--muted)) 0deg)`,
          borderRadius: "50%",
        }}
      >
        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              isComplete && "text-primary animate-pulse"
            )}
          >
            {formatTime(remaining)}
          </span>
        </div>
      </div>

      {isComplete ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary animate-pulse">
            Time's up!
          </span>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={togglePause}>
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={dismiss}>
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
