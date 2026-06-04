import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data, refetch, isLoading } = useListNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="page-subtitle">Review recent system alerts and communication updates</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => {
                toast({ title: "All notifications marked as read" });
                refetch();
              },
            })
          }
        >
          Mark All Read
        </Button>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading notifications...</p>}
          {data?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3">
              <div>
                <p className="text-sm font-semibold">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type} | {new Date(item.sentAt).toLocaleString()}
                </p>
              </div>
              {!item.readStatus && (
                <Button
                  size="sm"
                  onClick={() =>
                    markOne.mutate(
                      { id: item.id },
                      {
                        onSuccess: () => refetch(),
                      },
                    )
                  }
                >
                  Mark Read
                </Button>
              )}
            </div>
          ))}
          {data?.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
