import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { useScopedIds } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { isToday } from "date-fns";

export function DocumentsAttentionWidget() {
  const { documents } = useScopedIds();
  const { base } = useWorkspace();
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);

  const stats = useMemo(() => {
    const pendingReview = documents.filter((d) => d.status === "under_review" || d.status === "uploaded").length;
    const today = documents.filter((d) => d.uploadedAt && isToday(new Date(d.uploadedAt)) && d.uploadedByRole === "student").length;
    const rejected = documents.filter((d) => d.status === "rejected").length;
    return { pendingReview, today, rejected };
  }, [documents]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Documents needing attention</CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate({ to: currentUser?.role === "admin" ? "/admin/documents" : `${base}/documents` })}
        >
          View documents
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>{stats.pendingReview} documents pending review</p>
        <p>{stats.today} student uploads received today</p>
        <p>{stats.rejected} rejected documents require replacement</p>
      </CardContent>
    </Card>
  );
}
