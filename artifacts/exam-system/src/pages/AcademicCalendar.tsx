import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

type ExamEntry = { id: number; examName: string; subject: string; startTime: string; status: string };
type CalendarDay = { date: string; count: number; exams: ExamEntry[] };

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30",
  ongoing:   "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  draft:     "bg-muted text-muted-foreground border-border/40",
};

const DOT_COLORS: Record<string, string> = {
  scheduled: "bg-sky-500",
  ongoing:   "bg-amber-500",
  completed: "bg-emerald-500",
  draft:     "bg-muted-foreground/50",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchCalendar(month: string): Promise<{ days: CalendarDay[] }> {
  const token = localStorage.getItem("exam_auth_token");
  const res = await fetch(`/api/exams/calendar?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load calendar");
  return res.json();
}

export default function AcademicCalendar() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchCalendar(month)
      .then((d) => setDays(d.days ?? []))
      .finally(() => setIsLoading(false));
  }, [month]);

  const dayMap = useMemo(() => {
    const m: Record<string, CalendarDay> = {};
    for (const d of days) m[d.date] = d;
    return m;
  }, [days]);

  const [year, monthNum] = month.split("-").map(Number);
  const firstDayOfWeek = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const cells = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = selectedDate ? dayMap[selectedDate] : null;
  const today = new Date().toISOString().slice(0, 10);

  const totalExams = days.reduce((a, d) => a + d.count, 0);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Academic Calendar</h2>
          <p className="page-subtitle">Semester planner — exam schedule at a glance</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {totalExams} exam{totalExams !== 1 ? "s" : ""} this month
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {MONTHS[monthNum - 1]} {year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setMonth(addMonths(month, -1)); setSelectedDate(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => { setMonth(new Date().toISOString().slice(0, 7)); setSelectedDate(null); }}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setMonth(addMonths(month, 1)); setSelectedDate(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border/40">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className={cn("grid grid-cols-7", isLoading && "opacity-50 pointer-events-none")}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="min-h-[72px] border-b border-r border-border/20" />;
                const dateStr = `${month}-${String(day).padStart(2, "0")}`;
                const dayData = dayMap[dateStr];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "min-h-[72px] border-b border-r border-border/20 p-1.5 text-left transition-colors hover:bg-muted/40",
                      isSelected && "bg-primary/8 ring-1 ring-inset ring-primary/20",
                      (idx + 1) % 7 === 0 && "border-r-0",
                    )}
                  >
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday && "bg-primary text-primary-foreground",
                      !isToday && "text-foreground",
                    )}>
                      {day}
                    </span>
                    {dayData && (
                      <div className="mt-1 space-y-0.5">
                        {dayData.exams.slice(0, 2).map((e) => (
                          <div key={e.id} className={cn("flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-medium border", STATUS_COLORS[e.status] ?? STATUS_COLORS.draft)}>
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLORS[e.status] ?? "bg-muted-foreground")} />
                            <span className="truncate">{e.examName}</span>
                          </div>
                        ))}
                        {dayData.exams.length > 2 && (
                          <div className="px-1 text-[9px] text-muted-foreground">+{dayData.exams.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* Legend */}
          <Card className="border-border/70">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legend</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {Object.entries(DOT_COLORS).map(([status, cls]) => (
                <div key={status} className="flex items-center gap-2 text-xs capitalize">
                  <span className={cn("h-2.5 w-2.5 rounded-full", cls)} />
                  {status}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selectedDate && (
            <Card className="border-border/70">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {selectedDay?.exams.length ? (
                  <div className="space-y-2">
                    {selectedDay.exams.map((e, i) => (
                      <div key={e.id}>
                        {i > 0 && <Separator className="my-2" />}
                        <p className="text-sm font-semibold leading-tight">{e.examName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.subject} · {e.startTime}</p>
                        <Badge variant="secondary" className={cn("mt-1 text-[10px] capitalize border", STATUS_COLORS[e.status] ?? "")}>{e.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No exams scheduled</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming exams this month */}
          <Card className="border-border/70">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-0">
              {days.filter((d) => d.count > 0).length === 0 ? (
                <p className="text-xs text-muted-foreground">No exams this month</p>
              ) : (
                days.filter((d) => d.count > 0).map((d, i) => (
                  <div key={d.date}>
                    {i > 0 && <Separator className="my-2" />}
                    <button
                      className="w-full text-left"
                      onClick={() => setSelectedDate(d.date)}
                    >
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                      {d.exams.map((e) => (
                        <p key={e.id} className="text-xs mt-0.5 truncate">{e.examName}</p>
                      ))}
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
