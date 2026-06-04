import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, BookOpen, GraduationCap, Award, BarChart2 } from "lucide-react";

type ExamCol = { id: number; examName: string; subject: string; examDate: string };
type StudentResult = { marksObtained: number; totalMarks: number; grade: string; percentage: number; rank: number | null } | null;
type StudentRow = {
  studentId: number;
  name: string;
  rollNo: string;
  course: string;
  year: number;
  results: Record<string, StudentResult>;
  average: number | null;
};
type GradeBookData = { exams: ExamCol[]; students: StudentRow[] };

const GRADE_TEXT: Record<string, string> = {
  "A+": "text-emerald-600 dark:text-emerald-400",
  "A":  "text-emerald-600 dark:text-emerald-400",
  "B+": "text-sky-600 dark:text-sky-400",
  "B":  "text-sky-600 dark:text-sky-400",
  "C":  "text-amber-600 dark:text-amber-400",
  "D":  "text-orange-600 dark:text-orange-400",
  "F":  "text-red-600 dark:text-red-400",
};

async function fetchGradebook(): Promise<GradeBookData> {
  const token = localStorage.getItem("exam_auth_token");
  const res = await fetch("/api/gradebook", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load grade book");
  return res.json();
}

function avgColor(avg: number | null) {
  if (avg === null) return "text-muted-foreground/40";
  if (avg >= 75) return "text-emerald-700 dark:text-emerald-400";
  if (avg >= 50) return "text-sky-700 dark:text-sky-400";
  if (avg >= 33) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}


export default function GradeBook() {
  const [data, setData] = useState<GradeBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "average">("name");

  useEffect(() => {
    fetchGradebook()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const courses = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.students.map((s) => s.course))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.students;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }
    if (courseFilter !== "all") {
      rows = rows.filter((s) => s.course === courseFilter);
    }
    if (sortBy === "average") {
      rows = [...rows].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
    } else {
      rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [data, search, courseFilter, sortBy]);

  const topAvg = useMemo(() => {
    const all = (data?.students ?? []).filter((s) => s.average !== null).map((s) => s.average as number);
    return all.length ? Math.max(...all) : null;
  }, [data]);

  const classAvg = useMemo(() => {
    const all = (data?.students ?? []).filter((s) => s.average !== null).map((s) => s.average as number);
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
  }, [data]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Grade Book</h2>
          <p className="page-subtitle">All students and their scores across every exam</p>
        </div>
      </div>

      {/* Quick stats row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: GraduationCap, label: "Total Students", value: String(data.students.length) },
            { icon: BookOpen,      label: "Exams",          value: String(data.exams.length) },
            { icon: BarChart2,     label: "Class Average",  value: classAvg !== null ? `${classAvg}%` : "N/A" },
            { icon: Award,         label: "Top Score",      value: topAvg !== null ? `${topAvg}%` : "N/A" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
              style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.06) inset" }}
            >
              <div className="rounded-lg p-2 bg-muted/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
                <p className="text-lg font-extrabold leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main table card */}
      <div
        className="rounded-2xl border border-border/70 bg-card overflow-hidden"
        style={{ boxShadow: "0 2px 12px -4px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.05) inset" }}
      >
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 rounded-lg bg-background"
              placeholder="Search student or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-40 h-9 rounded-lg bg-background">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "average")}>
            <SelectTrigger className="w-40 h-9 rounded-lg bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by name</SelectItem>
              <SelectItem value="average">Sort by average</SelectItem>
            </SelectContent>
          </Select>
          {data && (
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
              {filtered.length} of {data.students.length} students
            </span>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cn("px-5 py-4", i !== 5 && "border-b border-border/30")}>
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : !data?.exams.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No exams or results found yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b-2 border-border/60">
                  <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40 min-w-[160px]">
                    Student
                  </th>
                  {data.exams.map((e, i) => (
                    <th
                      key={e.id}
                      className={cn(
                        "px-2 py-2.5 text-center text-[11px] font-semibold text-muted-foreground w-[80px]",
                        i !== data.exams.length - 1 && "border-r border-border/30",
                      )}
                    >
                      <div className="truncate max-w-[72px] font-semibold normal-case tracking-normal" title={e.examName}>
                        {e.examName}
                      </div>
                      <div className="text-[9px] font-normal text-muted-foreground/55 mt-0.5 truncate max-w-[72px]">
                        {e.subject}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-l border-border/40 w-[64px]">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, rowIdx) => (
                  <tr
                    key={student.studentId}
                    className={cn(
                      "group transition-colors hover:bg-muted/20",
                      rowIdx !== filtered.length - 1 && "border-b border-border/30",
                    )}
                  >
                    {/* Student name + roll + course — sticky, merged */}
                    <td className="sticky left-0 z-10 bg-background px-3 py-2.5 border-r border-border/40 group-hover:bg-muted/20 transition-colors min-w-[160px]">
                      <div className="font-semibold text-[12px] leading-tight truncate max-w-[150px]">
                        {student.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{student.rollNo}</span>
                        <span className="text-muted-foreground/40 text-[10px]">·</span>
                        <span className="text-[10px] text-muted-foreground/70">{student.course}</span>
                      </div>
                    </td>

                    {/* Exam scores */}
                    {data.exams.map((e, i) => {
                      const res = student.results[String(e.id)];
                      return (
                        <td
                          key={e.id}
                          className={cn(
                            "px-2 py-2.5 text-center w-[80px]",
                            i !== data.exams.length - 1 && "border-r border-border/20",
                          )}
                        >
                          {res ? (
                            <span className="inline-flex flex-col items-center leading-tight">
                              <span className={cn("text-[12px] font-bold", GRADE_TEXT[res.grade] ?? "text-foreground")}>
                                {res.grade}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-normal">{res.percentage.toFixed(0)}%</span>
                            </span>
                          ) : (
                            <span className="inline-block h-1 w-3 rounded-full bg-muted-foreground/20" />
                          )}
                        </td>
                      );
                    })}

                    {/* Average */}
                    <td className="px-3 py-2.5 text-center border-l border-border/40 w-[64px]">
                      {student.average !== null ? (
                        <span className={cn("text-[12px] font-bold tabular-nums", avgColor(student.average))}>
                          {student.average}%
                        </span>
                      ) : (
                        <span className="inline-block h-1 w-3 rounded-full bg-muted-foreground/20" />
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={data.exams.length + 2}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No students match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {data && !isLoading && (
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
              <span className="font-semibold text-foreground">{data.students.length}</span> students across{" "}
              <span className="font-semibold text-foreground">{data.exams.length}</span> exams
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
