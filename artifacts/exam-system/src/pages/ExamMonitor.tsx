import { Fragment, useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { StatusDot, StatusBadge } from "@/components/ui/status-dot";
import "./exam-monitor-cards.css";

type StudentRow = {
  studentId: number;
  name: string;
  rollNo: string;
  course: string;
  status: "not_started" | "in_progress" | "submitted";
  startTime: string | null;
  endTime: string | null;
  tabSwitches: number;
  incidents: string[];
};

type MonitorData = {
  exam: { id: number; examName: string; subject: string; startTime: string; duration: number };
  students: StudentRow[];
  counts: { notStarted: number; inProgress: number; submitted: number };
};

function statusBadge(status: StudentRow["status"]) {
  if (status === "in_progress") return <StatusBadge variant="amber"  label="In Progress" />;
  if (status === "submitted")   return <StatusBadge variant="green"  label="Submitted" />;
  return                               <StatusBadge variant="gray"   label="Not Started" />;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function incidentLabel(raw: string): { label: string; type: "tab" | "fullscreen" | "other" } {
  if (raw.startsWith("tab_switch:")) return { label: raw.replace("tab_switch:", "").trim() || "Tab/window switch", type: "tab" };
  if (raw.startsWith("fullscreen_exit:")) return { label: raw.replace("fullscreen_exit:", "").trim() || "Exited fullscreen", type: "fullscreen" };
  return { label: raw, type: "other" };
}

export default function ExamMonitor({ examId }: { examId: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

  const fetchMonitor = useCallback(async () => {
    try {
      const token = localStorage.getItem("exam_auth_token");
      const res = await fetch(`/api/exams/${examId}/live-monitor`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load monitor data");
      }
      setData(await res.json());
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 5000);
    return () => clearInterval(interval);
  }, [fetchMonitor]);

  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    setLocation("/401");
    return null;
  }

  const totalIncidents = data?.students.reduce((acc, s) => acc + (s.incidents?.length ?? 0), 0) ?? 0;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/exams">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="page-title">
              Live Monitor
              {data && <span className="ml-2 text-muted-foreground font-normal text-base">— {data.exam.examName}</span>}
            </h2>
            <p className="page-subtitle">
              {data ? `${data.exam.subject} · ${data.exam.startTime} · ${data.exam.duration} min` : "Loading exam details…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <Button size="sm" variant="outline" onClick={fetchMonitor}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Stats cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-4">
          {/* Not Started */}
          <div className="em-stat-box border-border/60 bg-border/30">
            <div className="em-stat-face border-border/50 bg-card">
              <div className="em-stat-number text-foreground">{data.counts.notStarted}</div>
              <div className="em-stat-label text-muted-foreground">Not Started</div>
            </div>
          </div>

          {/* In Progress */}
          <div className="em-stat-box border-amber-500/40 bg-amber-500/20">
            <div className="em-stat-face border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <StatusDot variant="amber" size="md" />
                <div className="em-stat-number text-amber-600">{data.counts.inProgress}</div>
              </div>
              <div className="em-stat-label text-amber-600/70">In Progress</div>
            </div>
          </div>

          {/* Submitted */}
          <div className="em-stat-box border-emerald-500/40 bg-emerald-500/20">
            <div className="em-stat-face border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <StatusDot variant="green" size="md" />
                <div className="em-stat-number text-emerald-600">{data.counts.submitted}</div>
              </div>
              <div className="em-stat-label text-emerald-600/70">Submitted</div>
            </div>
          </div>

          {/* Total Violations */}
          <div className={cn(
            "em-stat-box",
            totalIncidents > 0
              ? "border-destructive/40 bg-destructive/20"
              : "border-border/60 bg-border/30"
          )}>
            <div className={cn(
              "em-stat-face",
              totalIncidents > 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/50 bg-card"
            )}>
              <div className="flex items-center gap-2">
                {totalIncidents > 0 && <StatusDot variant="red" size="md" />}
                <div className={cn("em-stat-number", totalIncidents > 0 ? "text-destructive" : "text-muted-foreground")}>
                  {totalIncidents}
                </div>
              </div>
              <div className={cn("em-stat-label", totalIncidents > 0 ? "text-destructive/70" : "text-muted-foreground")}>
                Total Violations
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student table */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Student Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-center">Tab Switches</TableHead>
                    <TableHead className="text-center">Violations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No eligible students found for this exam.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.students.map((s) => {
                    const isExpanded = expandedStudent === s.studentId;
                    const incidents = s.incidents ?? [];
                    const hasIncidents = incidents.length > 0;

                    return (
                      <Fragment key={s.studentId}>
                        <TableRow
                          className={cn(
                            hasIncidents && "cursor-pointer hover:bg-muted/30",
                            isExpanded && "bg-muted/20"
                          )}
                          onClick={() => hasIncidents && setExpandedStudent(isExpanded ? null : s.studentId)}
                        >
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{s.rollNo}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{s.course}</TableCell>
                          <TableCell>{statusBadge(s.status)}</TableCell>
                          <TableCell className="text-xs tabular-nums">{fmt(s.startTime)}</TableCell>
                          <TableCell className="text-xs tabular-nums">{fmt(s.endTime)}</TableCell>
                          <TableCell className="text-center">
                            <span className={s.tabSwitches > 2 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {s.tabSwitches}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasIncidents ? (
                              <button
                                className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                                onClick={(e) => { e.stopPropagation(); setExpandedStudent(isExpanded ? null : s.studentId); }}
                              >
                                <ShieldAlert className="h-3 w-3" />
                                {incidents.length}
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded incident log */}
                        {isExpanded && (
                          <TableRow className="bg-destructive/5 hover:bg-destructive/5">
                            <TableCell colSpan={8} className="py-3 px-4">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-2">
                                  Incident Log — {s.name}
                                </p>
                                {incidents.map((raw, i) => {
                                  const { label, type } = incidentLabel(raw);
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 rounded-md border border-destructive/20 bg-background/60 px-3 py-2 text-xs"
                                    >
                                      <ShieldAlert className={cn(
                                        "h-3.5 w-3.5 mt-0.5 shrink-0",
                                        type === "tab" ? "text-amber-500" : "text-destructive"
                                      )} />
                                      <div className="min-w-0">
                                        <span className="font-semibold text-foreground mr-1.5">#{i + 1}</span>
                                        <span className={cn(
                                          "mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                          type === "tab"
                                            ? "bg-amber-500/15 text-amber-600"
                                            : type === "fullscreen"
                                            ? "bg-orange-500/15 text-orange-600"
                                            : "bg-destructive/15 text-destructive"
                                        )}>
                                          {type === "tab" ? "Tab Switch" : type === "fullscreen" ? "Fullscreen Exit" : "Violation"}
                                        </span>
                                        <span className="text-muted-foreground">{label}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Auto-refreshes every 5 seconds. Tab switches highlighted red if &gt; 2. Click the violations badge to view the full incident log.
      </p>
    </div>
  );
}
