import { useCallback, useEffect, useMemo, useState } from "react";
import { useListExams, useCreateExam, useDeleteExam } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { BookOpen, Building2, Copy, Loader2, Plus, Trash2, Zap } from "lucide-react";

type QBankQuestion = {
  id: number;
  questionText: string;
  subject: string;
  topic: string;
  difficulty: string;
  marks: number;
  options: string[] | null;
  correctAnswer: string | null;
};

type AssignedQuestion = {
  id: number;
  questionId: number;
  questionOrder: number;
  question: QBankQuestion;
};

type CalendarDay = {
  date: string;
  count: number;
  exams: Array<{ id: number; examName: string; subject: string; startTime: string; status: string }>;
};

type ExamHall = { id: number; examId: number; hallName: string; capacity: number; floorNo: string | null; building: string | null; assignedCount: number };
type HallAssignment = { id: number; hallId: number; studentId: number; seatNo: string; studentName: string; studentRollNo: string };

export default function ExamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [examListOpen, setExamListOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const listParams = useMemo(
    () => ({
      status: status === "all" ? undefined : (status as "upcoming" | "completed" | "ongoing"),
      subject: subject || undefined,
      page: 1,
      limit: 100,
    }),
    [status, subject],
  );

  const { data, refetch, isLoading } = useListExams(listParams);
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  const [form, setForm] = useState({
    examName: "",
    subject: "",
    examDate: "",
    startTime: "",
    duration: "",
    totalMarks: "",
    passingMarks: "",
  });

  const canCreateExam =
    form.examName.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    form.examDate.trim().length > 0 &&
    form.startTime.trim().length > 0 &&
    form.duration !== "" &&
    form.totalMarks !== "" &&
    form.passingMarks !== "";

  const fetchCalendar = async () => {
    setCalendarLoading(true);
    try {
      const token = localStorage.getItem("exam_auth_token");
      const response = await fetch(`/api/exams/calendar?month=${calendarMonth}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to load exam calendar");
      const payload = await response.json();
      setCalendarDays(payload.days ?? []);
    } catch (error) {
      toast({
        title: "Calendar load failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    void fetchCalendar();
  }, [calendarMonth]);

  const canManage = user?.role === "admin" || user?.role === "teacher";

  // ── Question management ──────────────────────────────────────────────────
  const [qDialogExam, setQDialogExam] = useState<{ id: number; examName: string; subject: string } | null>(null);
  const [assignedQs, setAssignedQs] = useState<AssignedQuestion[]>([]);
  const [bankQs, setBankQs] = useState<QBankQuestion[]>([]);
  const [selectedQIds, setSelectedQIds] = useState<Set<number>>(new Set());
  const [qLoading, setQLoading] = useState(false);
  const [autoForm, setAutoForm] = useState({ difficulty: "mixed", count: "10" });
  const [autoLoading, setAutoLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  // ── Hall Assignment ──────────────────────────────────────────────────────
  const [hallDialogExam, setHallDialogExam] = useState<{ id: number; examName: string } | null>(null);
  const [halls, setHalls] = useState<ExamHall[]>([]);
  const [hallAssignments, setHallAssignments] = useState<Record<number, HallAssignment[]>>({});
  const [hallLoading, setHallLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [expandedHall, setExpandedHall] = useState<number | null>(null);
  const [newHallForm, setNewHallForm] = useState({ hallName: "", capacity: "30", floorNo: "", building: "" });
  const [addingHall, setAddingHall] = useState(false);
  const [showHallForm, setShowHallForm] = useState(false);

  const loadHalls = async (examId: number) => {
    setHallLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/halls`, { headers: authHeaders() });
      if (res.ok) setHalls(await res.json());
    } catch { toast({ title: "Failed to load halls", variant: "destructive" }); }
    finally { setHallLoading(false); }
  };

  const loadHallAssignments = async (hallId: number) => {
    try {
      const res = await fetch(`/api/halls/${hallId}/assignments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHallAssignments((prev) => ({ ...prev, [hallId]: data }));
      }
    } catch { /* silent */ }
  };

  const openHallDialog = async (exam: { id: number; examName: string }) => {
    setHallDialogExam(exam);
    setHalls([]);
    setHallAssignments({});
    setExpandedHall(null);
    setShowHallForm(false);
    await loadHalls(exam.id);
  };

  const handleAddHall = async () => {
    if (!hallDialogExam || !newHallForm.hallName || !newHallForm.capacity) return;
    setAddingHall(true);
    try {
      const res = await fetch(`/api/exams/${hallDialogExam.id}/halls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ hallName: newHallForm.hallName, capacity: Number(newHallForm.capacity), floorNo: newHallForm.floorNo || null, building: newHallForm.building || null }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
      toast({ title: "Hall created" });
      setNewHallForm({ hallName: "", capacity: "30", floorNo: "", building: "" });
      setShowHallForm(false);
      await loadHalls(hallDialogExam.id);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setAddingHall(false); }
  };

  const handleDeleteHall = async (hallId: number) => {
    if (!hallDialogExam) return;
    const res = await fetch(`/api/halls/${hallId}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok || res.status === 204) { toast({ title: "Hall removed" }); await loadHalls(hallDialogExam.id); }
  };

  const handleAutoAssign = async () => {
    if (!hallDialogExam) return;
    setAutoAssigning(true);
    try {
      const res = await fetch(`/api/exams/${hallDialogExam.id}/halls/auto-assign`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Auto-assign failed"); }
      const data = await res.json();
      toast({ title: `${data.assigned} students assigned${data.unassigned > 0 ? `, ${data.unassigned} could not fit` : ""}` });
      await loadHalls(hallDialogExam.id);
      setHallAssignments({});
      setExpandedHall(null);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setAutoAssigning(false); }
  };

  const toggleHallExpand = async (hallId: number) => {
    if (expandedHall === hallId) { setExpandedHall(null); return; }
    setExpandedHall(hallId);
    if (!hallAssignments[hallId]) await loadHallAssignments(hallId);
  };

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("exam_auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const openQDialog = useCallback(async (exam: { id: number; examName: string; subject: string }) => {
    setQDialogExam(exam);
    setQLoading(true);
    try {
      const [assignedRes, bankRes] = await Promise.all([
        fetch(`/api/exams/${exam.id}/questions`, { headers: authHeaders() }),
        fetch(`/api/questions?limit=500`, { headers: authHeaders() }),
      ]);
      const assignedData: AssignedQuestion[] = assignedRes.ok ? await assignedRes.json() : [];
      const bankData = bankRes.ok ? await bankRes.json() : { questions: [] };
      setAssignedQs(assignedData);
      setBankQs(bankData.questions ?? []);
      setSelectedQIds(new Set(assignedData.map((a) => a.questionId)));
    } catch {
      toast({ title: "Failed to load questions", variant: "destructive" });
    } finally {
      setQLoading(false);
    }
  }, [toast]);

  const handleAutoGenerate = async () => {
    if (!qDialogExam) return;
    setAutoLoading(true);
    try {
      const res = await fetch(`/api/exams/${qDialogExam.id}/auto-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subject: qDialogExam.subject, difficulty: autoForm.difficulty, count: Number(autoForm.count) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Auto-generate failed");
      }
      const refreshed: AssignedQuestion[] = await fetch(`/api/exams/${qDialogExam.id}/questions`, { headers: authHeaders() })
        .then((r) => r.json());
      setAssignedQs(refreshed);
      setSelectedQIds(new Set(refreshed.map((a) => a.questionId)));
      toast({ title: `${refreshed.length} questions auto-assigned!` });
      refetch();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setAutoLoading(false);
    }
  };

  const handleSaveManual = async () => {
    if (!qDialogExam) return;
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/exams/${qDialogExam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ questionIds: [...selectedQIds] }),
      });
      if (!res.ok) throw new Error("Save failed");
      const refreshed: AssignedQuestion[] = await fetch(`/api/exams/${qDialogExam.id}/questions`, { headers: authHeaders() })
        .then((r) => r.json());
      setAssignedQs(refreshed);
      toast({ title: `${refreshed.length} questions saved to exam` });
      refetch();
    } catch {
      toast({ title: "Failed to save questions", variant: "destructive" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDuplicate = async (examId: number, examName: string) => {
    setDuplicatingId(examId);
    try {
      const res = await fetch(`/api/exams/${examId}/duplicate`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Duplicate failed");
      }
      toast({ title: "Exam duplicated!", description: `"${examName} (Copy)" created with all questions.` });
      refetch();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setDuplicatingId(null);
    }
  };

  const toggleQ = (id: number) =>
    setSelectedQIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Exams</h2>
          <p className="page-subtitle">Create schedules and track upcoming assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setExamListOpen(true)}>
            Open Exam List
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/70">
        {canManage && (
          <>
            <CardHeader className="pb-2">
              <CardTitle>Create New Exam</CardTitle>
              <p className="text-sm text-muted-foreground">Fill in the details below to schedule a new exam. All fields are required.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Row 1: Name + Subject */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Exam Name <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="e.g. Mid Term Mathematics Test"
                    value={form.examName}
                    onChange={(e) => setForm((prev) => ({ ...prev, examName: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Give a clear, descriptive name students will recognise.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="e.g. Mathematics, Physics, History"
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Must match the subject used in your Question Bank for auto-assign to work.</p>
                </div>
              </div>

              {/* Row 2: Date + Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Exam Date <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, examDate: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Select the date on which the exam will be held.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start Time <span className="text-destructive">*</span></label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Time when students can begin the exam (24-hour format).</p>
                </div>
              </div>

              {/* Row 3: Duration + Exam Type */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (minutes) <span className="text-destructive">*</span></label>
                  <Input
                    type="number"
                    min={1}
                    max={360}
                    value={form.duration}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g. 60 for 1 hour, 90 for 1.5 hours"
                  />
                  <p className="text-xs text-muted-foreground">Total allowed time in minutes. Countdown starts when student begins.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Exam Format</label>
                  <div className="flex h-9 items-center rounded-md border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground">
                    MCQ — Multiple Choice Questions only
                  </div>
                  <p className="text-xs text-muted-foreground">Only MCQ format is supported. Questions assigned from the Question Bank.</p>
                </div>
              </div>

              {/* Row 4: Total Marks + Passing Marks */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Total Marks <span className="text-destructive">*</span></label>
                  <Input
                    type="number"
                    min={1}
                    value={form.totalMarks}
                    onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
                    placeholder="e.g. 100"
                  />
                  <p className="text-xs text-muted-foreground">Maximum score a student can achieve. Usually equals sum of question marks.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Passing Marks <span className="text-destructive">*</span></label>
                  <Input
                    type="number"
                    min={1}
                    value={form.passingMarks}
                    onChange={(e) => setForm((prev) => ({ ...prev, passingMarks: e.target.value }))}
                    placeholder="e.g. 40 (40% of total)"
                  />
                  <p className="text-xs text-muted-foreground">Minimum marks needed to pass. Students below this will be marked as Fail.</p>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                <Button
                  size="sm"
                  disabled={createExam.isPending || !canCreateExam}
                  onClick={() =>
                    createExam.mutate(
                      {
                        data: {
                          examName: form.examName,
                          subject: form.subject,
                          examDate: new Date(form.examDate).toISOString(),
                          startTime: form.startTime,
                          duration: Number(form.duration),
                          totalMarks: Number(form.totalMarks),
                          passingMarks: Number(form.passingMarks),
                          examType: "mcq",
                          eligibleCourses: [],
                        },
                      },
                      {
                        onSuccess: () => {
                          setForm({ examName: "", subject: "", examDate: "", startTime: "", duration: "", totalMarks: "", passingMarks: "" });
                          toast({ title: "Exam created successfully!", description: "Now open Exam List → Questions to assign questions." });
                          refetch();
                        },
                        onError: (error) =>
                          toast({
                            title: "Create failed",
                            description: error.message,
                            variant: "destructive",
                          }),
                      },
                    )
                  }
                >
                  {createExam.isPending ? "Creating..." : "Create Exam"}
                </Button>
                {!canCreateExam && (
                  <p className="text-xs text-muted-foreground">Fill all required fields (<span className="text-destructive">*</span>) to enable.</p>
                )}
              </div>
            </CardContent>
            <div className="px-6">
              <Separator className="h-px bg-border/80" />
            </div>
          </>
        )}

        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Exam Calendar</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Input
                type="month"
                placeholder="Select month"
                value={calendarMonth}
                onChange={(e) => setCalendarMonth(e.target.value)}
                className="w-full sm:w-44"
              />
              <Button size="sm" onClick={fetchCalendar}>
                {calendarLoading ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-background/60">
            {calendarDays.map((day, index) => (
              <div key={day.date}>
                <div className="p-3">
                  <p className="text-sm font-semibold">
                    {day.date} ({day.count})
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">
                    {day.exams.map((exam) => (
                      <li key={exam.id}>
                        {exam.examName} - {exam.subject} ({exam.startTime})
                      </li>
                    ))}
                  </ul>
                </div>
                {index < calendarDays.length - 1 && <Separator />}
              </div>
            ))}
            {calendarDays.length === 0 && !calendarLoading && (
              <p className="p-3 text-sm text-muted-foreground">No exams found for {calendarMonth}. Try another month.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={examListOpen} onOpenChange={setExamListOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Exam List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="search"
                placeholder="Filter by subject (e.g. Physics)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading exams...</p>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-lg border border-border/70 bg-background/60">
                {data?.exams.map((exam, index) => (
                  <div key={exam.id}>
                    <div className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{exam.examName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {exam.subject} &nbsp;·&nbsp; {new Date(exam.examDate).toLocaleDateString()} &nbsp;·&nbsp; {exam.startTime} &nbsp;·&nbsp;
                            <span className={`font-medium ${exam.status === "ongoing" ? "text-emerald-600" : exam.status === "completed" ? "text-muted-foreground" : "text-amber-600"}`}>
                              {exam.status}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {user?.role === "student" && (
                            <Link href={`/exam-session/${exam.id}`}>
                              <Button size="sm" onClick={() => setExamListOpen(false)}>
                                Start
                              </Button>
                            </Link>
                          )}
                          {canManage && (
                            <>
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setExamListOpen(false); void openHallDialog({ id: exam.id, examName: exam.examName }); }}
                                >
                                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                                  Halls
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openQDialog({ id: exam.id, examName: exam.examName, subject: exam.subject })}
                              >
                                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                Questions
                                {(exam as any).questionCount != null && (
                                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                                    {(exam as any).questionCount}
                                  </Badge>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={duplicatingId === exam.id}
                                onClick={() => handleDuplicate(exam.id, exam.examName)}
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                {duplicatingId === exam.id ? "Copying..." : "Copy"}
                              </Button>
                              <Link href={`/exam-monitor/${exam.id}`}>
                                <Button size="sm" variant="outline" onClick={() => setExamListOpen(false)}>
                                  Monitor
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("exam_auth_token");
                                    const res = await fetch(`/api/admit-cards/exam/${exam.id}/bulk-zip`, {
                                      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                    });
                                    if (!res.ok) {
                                      const err = await res.json().catch(() => ({}));
                                      toast({ title: err.error || "Download failed", variant: "destructive" });
                                      return;
                                    }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `admit-cards-${exam.examName.replace(/\s+/g, "_")}.zip`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch {
                                    toast({ title: "Download failed", variant: "destructive" });
                                  }
                                }}
                              >
                                Admit Cards ZIP
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  deleteExam.mutate(
                                    { id: exam.id },
                                    {
                                      onSuccess: () => refetch(),
                                      onError: (error) =>
                                        toast({
                                          title: "Delete failed",
                                          description: error.message,
                                          variant: "destructive",
                                        }),
                                    },
                                  )
                                }
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < (data?.exams.length ?? 0) - 1 && <Separator />}
                  </div>
                ))}
                {data?.exams.length === 0 && <p className="p-3 text-sm text-muted-foreground">No exams found.</p>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hall Assignment Dialog ── */}
      <Dialog open={!!hallDialogExam} onOpenChange={(open) => { if (!open) setHallDialogExam(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Hall Assignment — {hallDialogExam?.examName}
            </DialogTitle>
            <DialogDescription>Create exam halls, then auto-assign students to seats.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setShowHallForm((v) => !v)} className="rounded-xl">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Hall
              </Button>
              <Button size="sm" onClick={handleAutoAssign} disabled={autoAssigning || halls.length === 0} className="rounded-xl">
                {autoAssigning ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Assigning…</> : "Auto-Assign Students"}
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {halls.reduce((a, h) => a + h.capacity, 0)} total seats · {halls.reduce((a, h) => a + h.assignedCount, 0)} assigned
              </span>
            </div>

            {/* Add hall form */}
            {showHallForm && (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Hall name (e.g. Block A)" value={newHallForm.hallName} onChange={(e) => setNewHallForm((p) => ({ ...p, hallName: e.target.value }))} />
                  <Input type="number" placeholder="Capacity" value={newHallForm.capacity} onChange={(e) => setNewHallForm((p) => ({ ...p, capacity: e.target.value }))} />
                  <Input placeholder="Floor (optional)" value={newHallForm.floorNo} onChange={(e) => setNewHallForm((p) => ({ ...p, floorNo: e.target.value }))} />
                  <Input placeholder="Building (optional)" value={newHallForm.building} onChange={(e) => setNewHallForm((p) => ({ ...p, building: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowHallForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddHall} disabled={addingHall}>{addingHall ? "Adding…" : "Create Hall"}</Button>
                </div>
              </div>
            )}

            {/* Halls list */}
            {hallLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading halls…</p>
            ) : halls.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No halls created yet. Add a hall to get started.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {halls.map((hall) => (
                  <div key={hall.id} className="rounded-lg border border-border/60 bg-background/60">
                    <button
                      className="w-full flex items-center justify-between p-3 text-left"
                      onClick={() => void toggleHallExpand(hall.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{hall.hallName}</p>
                          <p className="text-xs text-muted-foreground">
                            Capacity {hall.capacity} · {hall.assignedCount} assigned
                            {hall.building && ` · ${hall.building}`}
                            {hall.floorNo && ` Floor ${hall.floorNo}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.round((hall.assignedCount / hall.capacity) * 100)}% full
                        </Badge>
                        <button
                          className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteHall(hall.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </button>
                    {expandedHall === hall.id && (
                      <div className="border-t border-border/40 px-3 pb-3">
                        {hallAssignments[hall.id] ? (
                          hallAssignments[hall.id].length === 0 ? (
                            <p className="pt-2 text-xs text-muted-foreground">No students assigned yet. Use Auto-Assign.</p>
                          ) : (
                            <div className="pt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                              {hallAssignments[hall.id].map((a) => (
                                <div key={a.id} className="rounded border border-border/50 bg-muted/30 px-2 py-1">
                                  <p className="text-[10px] font-bold text-muted-foreground">{a.seatNo}</p>
                                  <p className="text-xs font-medium truncate">{a.studentName}</p>
                                  <p className="text-[10px] text-muted-foreground">{a.studentRollNo}</p>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <p className="pt-2 text-xs text-muted-foreground">Loading…</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Manage Questions Dialog ── */}
      <Dialog open={!!qDialogExam} onOpenChange={(open) => { if (!open) setQDialogExam(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Questions — {qDialogExam?.examName}</DialogTitle>
            <DialogDescription>
              Subject: <strong>{qDialogExam?.subject}</strong> · Currently assigned: <strong>{assignedQs.length}</strong> question(s)
            </DialogDescription>
          </DialogHeader>

          {qLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Tabs defaultValue="auto">
              <TabsList className="mb-3 w-full">
                <TabsTrigger value="auto" className="flex-1">
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Auto-Assign from Bank
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  Manual Select ({selectedQIds.size})
                </TabsTrigger>
              </TabsList>

              {/* Auto-assign tab */}
              <TabsContent value="auto" className="space-y-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Randomly pick questions from the bank that match <strong>{qDialogExam?.subject}</strong> and the selected difficulty.
                  </p>
                  <div className="flex gap-3">
                    <Select value={autoForm.difficulty} onValueChange={(v) => setAutoForm((p) => ({ ...p, difficulty: v }))}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      className="w-32"
                      placeholder="Count"
                      value={autoForm.count}
                      onChange={(e) => setAutoForm((p) => ({ ...p, count: e.target.value }))}
                    />
                    <Button onClick={handleAutoGenerate} disabled={autoLoading} className="ml-auto">
                      {autoLoading ? "Assigning…" : "Auto-Assign"}
                    </Button>
                  </div>
                </div>

                {assignedQs.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currently Assigned</p>
                    {assignedQs.map((aq, i) => (
                      <div key={aq.id} className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5 text-sm">
                        <span className="mt-0.5 min-w-[20px] text-xs text-muted-foreground">{i + 1}.</span>
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium">{aq.question.questionText}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{aq.question.topic} · {aq.question.difficulty} · {aq.question.marks} mark(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {assignedQs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No questions assigned yet. Use Auto-Assign or switch to Manual Select.</p>
                )}
              </TabsContent>

              {/* Manual select tab */}
              <TabsContent value="manual" className="space-y-3">
                {bankQs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions in the bank. Add questions from the Question Bank page first.</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Check the questions you want in this exam. Showing all {bankQs.length} question(s) in bank.</p>
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {bankQs.map((q) => (
                        <label
                          key={q.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-2.5 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedQIds.has(q.id)}
                            onCheckedChange={() => toggleQ(q.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm line-clamp-2 font-medium">{q.questionText}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {q.subject} · {q.topic} · {q.difficulty} · {q.marks} mark(s)
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">{selectedQIds.size} question(s) selected</span>
                      <Button onClick={handleSaveManual} disabled={saveLoading}>
                        {saveLoading ? "Saving…" : "Save Selection"}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
