import { ClockIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tradingPiApi } from "@/api/client";
import type { TimelineEvent } from "@/api/types";

export function TimelinePage() {
  const { data: timelineData, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => tradingPiApi.timeline().catch(() => null),
    refetchInterval: 10000,
  });

  const events = Array.isArray(timelineData)
    ? (timelineData as TimelineEvent[])
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">执行时间线</p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ClockIcon className="size-4" />
          工作流事件
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">加载中...</p>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无时间线事件。发送消息开始交互后将显示执行流程。</p>
        ) : (
          <div className="space-y-1">
            {events.map((event, i) => (
              <div
                key={event.id || i}
                className="flex items-start gap-3 rounded-md border p-2.5 text-sm"
              >
                <span
                  className={`mt-0.5 size-2 shrink-0 rounded-full ${
                    event.status === "completed"
                      ? "bg-emerald-500"
                      : event.status === "running"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-red-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{event.title || event.type}</div>
                  {event.created_at && (
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
