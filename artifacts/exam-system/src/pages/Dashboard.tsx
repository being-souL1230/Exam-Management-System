import { useAuth } from "@/hooks/use-auth";
import { useGetAdminDashboard, useGetTeacherDashboard, useGetStudentDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { CheckCircle2, Lock, TrendingUp, TrendingDown, Minus, FileText, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import "@/components/ui/dashboard-stat-card.css";

function useMyAdmitCards() {
  const token = localStorage.getItem("exam_auth_token");
  return useQuery({
    queryKey: ["/api/admit-cards/my"],
    queryFn: async () => {
      const res = await fetch("/api/admit-cards/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<any[]>;
    },
  });
}

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "admin") {
    return <AdminDashboard />;
  }
  if (user.role === "teacher") {
    return <TeacherDashboard />;
  }
  return <StudentDashboard />;
}

function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Dashboard</h2>
          <p className="page-subtitle">Monitor platform activity and upcoming assessments</p>
        </div>
      </div>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={data.totalStudents} />
        <StatCard title="Total Exams" value={data.totalExams} />
        <StatCard title="Upcoming Exams" value={data.upcomingExams} />
        <StatCard title="Completed Exams" value={data.completedExams} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Exams</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <div className="p-4 space-y-2">
                {data.recentExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent exams.</p>
                ) : (
                  data.recentExams.map((exam, index) => (
                    <div key={exam.id}>
                      <div className="flex items-center justify-between py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{exam.examName}</p>
                          <p className="text-xs text-muted-foreground">
                            {exam.subject} | {formatDate(exam.examDate)} | {exam.startTime}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">{exam.status}</Badge>
                      </div>
                      {index < data.recentExams.length - 1 && <Separator />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-1 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Exam Volume</CardTitle>
              <span className="text-xs text-muted-foreground">last 6 months</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-2">
            {data.examsByMonth.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No exam volume data yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.examsByMonth.slice(-6).map((item) => (
                  <div
                    key={item.month}
                    className="flex flex-col items-center justify-center rounded-md border border-border/60 bg-muted/30 py-2 px-1 gap-0.5"
                  >
                    <span className="text-[11px] font-bold tabular-nums text-foreground leading-none">
                      {item.count}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
                      {formatMonth(item.month).slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Subject Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.performanceOverview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No result analytics available yet.</p>
          ) : (
            data.performanceOverview.map((item, index) => (
              <div key={item.subject}>
                <div className="py-1.5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{item.subject}</p>
                    <Badge variant="secondary">{item.passRate.toFixed(1)}% pass</Badge>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <span>Avg: {item.averageScore.toFixed(1)}%</span>
                    <span>High: {item.highestScore.toFixed(1)}%</span>
                    <span>Low: {item.lowestScore.toFixed(1)}%</span>
                    <span>Students: {item.totalStudents}</span>
                  </div>
                </div>
                {index < data.performanceOverview.length - 1 && <Separator />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherDashboard() {
  const { data, isLoading } = useGetTeacherDashboard();

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Teacher Dashboard</h2>
          <p className="page-subtitle">Track exam pipeline and grading workload</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Exams" value={data.myExams} />
        <StatCard title="Upcoming Exams" value={data.upcomingExams} />
        <StatCard title="Pending Grading" value={data.pendingGrading} />
        <StatCard title="Active Subjects" value={data.performanceOverview.length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Exams</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <div className="p-4 space-y-2">
                {data.recentExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exams created yet.</p>
                ) : (
                  data.recentExams.map((exam, index) => (
                    <div key={exam.id}>
                      <div className="flex items-center justify-between gap-3 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{exam.examName}</p>
                          <p className="text-xs text-muted-foreground">
                            {exam.subject} | {formatDate(exam.examDate)} | {exam.startTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {exam.resultsPublished && <Badge variant="secondary">Published</Badge>}
                          <Badge variant="outline" className="capitalize">{exam.status}</Badge>
                        </div>
                      </div>
                      {index < data.recentExams.length - 1 && <Separator />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-0 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Grading & Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming exams</span>
                <span className="text-2xl font-bold tabular-nums leading-none">{data.upcomingExams}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending grading</span>
                <span className="text-2xl font-bold tabular-nums leading-none">{data.pendingGrading}</span>
              </div>
              <Separator />
              <div className="pt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Focus areas</p>
                <p className="text-xs text-muted-foreground">Check submissions</p>
                <p className="text-xs text-muted-foreground">Publish results when ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Subject Performance Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.performanceOverview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No graded results available yet.</p>
          ) : (
            data.performanceOverview.map((item, index) => (
              <div key={item.subject}>
                <div className="py-1.5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{item.subject}</p>
                    <Badge variant="secondary">{item.passRate.toFixed(1)}% pass</Badge>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <span>Avg: {item.averageScore.toFixed(1)}%</span>
                    <span>High: {item.highestScore.toFixed(1)}%</span>
                    <span>Low: {item.lowestScore.toFixed(1)}%</span>
                    <span>Students: {item.totalStudents}</span>
                  </div>
                </div>
                {index < data.performanceOverview.length - 1 && <Separator />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDashboard() {
  const { data, isLoading } = useGetStudentDashboard();
  const { data: admitCards } = useMyAdmitCards();
  const token = localStorage.getItem("exam_auth_token") ?? "";

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Student Dashboard</h2>
          <p className="page-subtitle">Check progress and plan your next exam</p>
        </div>
      </div>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Overall Percentage" value={`${data.overallPercentage}%`} />
        <StatCard title="Total Exams Taken" value={data.totalExamsTaken} />
        <StatCard title="Upcoming Exams" value={data.upcomingExams.length} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[360px] overflow-y-auto px-4 pb-4 pt-2 space-y-2">
            {data.recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              data.recentResults.map((result) => (
                <div key={result.id} className="rounded-md border border-border/70 bg-background/50 p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{result.examName}</p>
                    <Badge variant={result.percentage >= 40 ? "secondary" : "destructive"}>{result.grade}</Badge>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                    <span>Subject: {result.subject}</span>
                    <span>Score: {result.marksObtained}/{result.totalMarks}</span>
                    <span>Percentage: {result.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Exams</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[360px] overflow-y-auto px-4 pb-4 pt-1 space-y-2">
            {data.upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No exams scheduled.</p>
            ) : (
              data.upcomingExams.map((exam: any) => {
                const done = exam.myStatus === "submitted";
                const windowStatus = getExamWindowStatus(exam);
                return (
                  <div
                    key={exam.id}
                    className="rounded-md border border-border/70 bg-background/50 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{exam.examName}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.subject} | {formatDate(exam.examDate)} {exam.startTime ? `at ${exam.startTime}` : ""} | {exam.duration}min
                        </p>
                      </div>
                      {done ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </span>
                      ) : windowStatus === "active" ? (
                        <Link href={`/exam-session/${exam.id}`}>
                          <Button size="sm" className="shrink-0 h-7 text-xs px-3 bg-green-600 hover:bg-green-700">
                            Start Now
                          </Button>
                        </Link>
                      ) : windowStatus === "upcoming" ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
                          <Clock className="h-3 w-3" />
                          Upcoming
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded-full border border-muted/60 bg-muted/30 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          Closed
                        </span>
                      )}
                    </div>
                    {!done && windowStatus === "upcoming" && exam.examWindowStart && (
                      <p className="mt-1 text-[11px] text-yellow-700 dark:text-yellow-400">
                        Opens: {new Date(exam.examWindowStart).toLocaleString()}
                      </p>
                    )}
                    {done && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 px-2 py-1">
                        <Lock className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                        <p className="text-[11px] text-green-700 dark:text-green-300 font-medium">
                          Score: {exam.myMarksObtained ?? "—"}/{exam.myTotalMarks ?? "—"} &nbsp;·&nbsp; Grade: {exam.myGrade ?? "—"} &nbsp;·&nbsp; {exam.myPercentage != null ? `${Number(exam.myPercentage).toFixed(1)}%` : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {admitCards && admitCards.length > 0 && (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              My Admit Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {admitCards.map((card: any) => (
              <div key={card.id} className="rounded-md border border-border/70 bg-background/50 p-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{card.examName}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.subject} · {card.examDate?.slice(0, 10)} · {card.examStartTime}
                  </p>
                </div>
                <a
                  href={`/api/admit-cards/${card.id}/pdf?token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs">
                    Download
                  </Button>
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {data.performanceTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">Trend data will appear after more results.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {data.performanceTrend.map((item) => {
                const pct = Math.max(0, Math.min(100, item.percentage));
                const accent = pct >= 75 ? "#10b981" : pct >= 50 ? "#3b82f6" : pct >= 33 ? "#f59e0b" : "#ef4444";
                const Icon = pct >= 60 ? TrendingUp : pct >= 33 ? Minus : TrendingDown;
                return (
                  <div
                    key={`${item.examName}-${item.date}`}
                    style={{
                      backgroundColor: "#e5e7eb",
                      boxShadow: "-6px -6px 14px #ffffff, 6px 6px 14px rgb(153,161,175), inset -4px -4px 10px rgb(209,213,220)",
                      borderRadius: "16px",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "0.35rem", gap: "0.4rem" }}>
                      <span style={{
                        position: "relative",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: accent,
                        boxShadow: "-2px -2px 4px #ffffff, 2px 2px 4px rgb(153,161,175)",
                        width: "1.4rem",
                        height: "1.4rem",
                        borderRadius: "9999px",
                        flexShrink: 0,
                      }}>
                        <Icon size={11} color="#fff" strokeWidth={2.5} />
                      </span>
                      <p className="truncate text-[11px] font-semibold text-gray-600 leading-tight flex-1" style={{ margin: 0 }}>
                        {item.examName}
                      </p>
                    </div>

                    <p style={{ color: "#1f2937", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.1, margin: "0.3rem 0" }}>
                      {pct.toFixed(0)}<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6b7280" }}>%</span>
                    </p>

                    <div style={{
                      position: "relative",
                      backgroundColor: "#e5e7eb",
                      boxShadow: "-2px -2px 4px #ffffff, 2px 2px 4px rgb(153,161,175)",
                      width: "100%",
                      height: "6px",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", top: 0, left: 0,
                        backgroundColor: accent,
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: "4px",
                        transition: "width 0.6s ease",
                      }} />
                    </div>

                    {item.date && (
                      <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "0.3rem", margin: "0.3rem 0 0" }}>
                        {new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string | number, icon?: any }) {
  return (
    <div className="dsc-card">
      <div className="dsc-top">
        <p className="dsc-label">{title}</p>
        <p className="dsc-value">{value}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-shell">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getExamWindowStatus(exam: any): "active" | "upcoming" | "expired" {
  const now = Date.now();
  const start = exam.examWindowStart ? new Date(exam.examWindowStart).getTime() : NaN;
  const end = exam.examWindowEnd ? new Date(exam.examWindowEnd).getTime() : NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return "active";
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

function formatMonth(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
