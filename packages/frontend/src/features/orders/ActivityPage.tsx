import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog } from "@/types";

function actionColor(action: string) {
  if (action.startsWith("CREATED")) return "bg-green-500";
  if (action.startsWith("UPDATED")) return "bg-blue-500";
  if (action.startsWith("DELETED") || action.startsWith("DEACTIVATED")) return "bg-red-500";
  if (action.startsWith("CANCELLED")) return "bg-orange-500";
  return "bg-primary";
}

function entityBadge(entityType: string) {
  switch (entityType) {
    case "PRODUCT": return "secondary";
    case "ORDER": return "default";
    case "USER": return "outline";
    default: return "outline";
  }
}

export function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: () =>
      api
        .get("/activity", { params: { limit: 50 } })
        .then((r) => r.data as { logs: ActivityLog[]; total: number }),
  });

  const logs = data?.logs || [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          Track all changes and actions in your store
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Your activity history will appear here as you use VendStock"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Showing {logs.length} of {data?.total || 0} activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 relative">
                    <div
                      className={`w-6 h-6 rounded-full ${actionColor(
                        log.action
                      )} flex-shrink-0 z-10 ring-4 ring-background`}
                    />
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.action}
                        </span>
                        <Badge variant={entityBadge(log.entityType) as any}>
                          {log.entityType}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-sm mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
