import { useMemo, useState } from "react";
import {
  useCalculateResults,
  useGetExamResults,
  useListExams,
  usePublishResults,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, ScanSearch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PlagPair = {
  student1: { id: number; name: string; rollNo: string; tabSwitches: number };
  student2: { id: number; name: string; rollNo: string; tabSwitches: number };
  similarity: number;
  matchedQuestions: number;
  totalCompared: number;
};

type PlagResult = {
  suspicious: PlagPair[];
  totalPairs: number;
  flaggedPairs: number;
  message?: string;
};

async function runPlagiarismCheck(examId: number): Promise<PlagResult> {
  const token = localStorage.getItem("exam_auth_token");
  const res = await fetch(`/api/exams/${examId}/plagiarism`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Check failed"); }
  return res.json();
}

export default function ResultsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [plagResult, setPlagResult] = useState<PlagResult | null>(null);
  const [plagLoading, setPlagLoading] = useState(false);

  const { data: examsData } = useListExams({ page: 1, limit: 100 });
  const examId = useMemo(() => selectedExamId ?? examsData?.exams[0]?.id ?? 0, [selectedExamId, examsData]);
  const { data: results, refetch } = useGetExamResults(examId, {
    query: { queryKey: ["/api/results/exam", examId], enabled: examId > 0 },
  });
  const calculate = useCalculateResults();
  const publish = usePublishResults();

  const canManage = user?.role === "admin" || user?.role === "teacher";

  const handleExamChange = (value: string) => {
    setSelectedExamId(Number(value));
    setPlagResult(null);
  };

  const handlePlagCheck = async () => {
    if (!examId) return;
    setPlagLoading(true);
    try {
      const res = await runPlagiarismCheck(examId);
      setPlagResult(res);
    } catch (e: any) {
      toast({ title: "Plagiarism check failed", description: e.message, variant: "destructive" });
    } finally {
      setPlagLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Results</h2>
          <p className="page-subtitle">Calculate, publish and export student marksheets</p>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle>Exam Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={String(examId || "")} onValueChange={handleExamChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an exam" />
            </SelectTrigger>
            <SelectContent>
              {examsData?.exams.map((exam) => (
                <SelectItem key={exam.id} value={String(exam.id)}>
                  {exam.examName} ({new Date(exam.examDate).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={examId <= 0 || calculate.isPending}
                onClick={() =>
                  calculate.mutate(
                    { examId },
                    {
                      onSuccess: () => { toast({ title: "Results calculated" }); refetch(); },
                      onError: (error) => toast({ title: "Calculation failed", description: error.message, variant: "destructive" }),
                    },
                  )
                }
              >
                Calculate Results
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={examId <= 0 || publish.isPending}
                onClick={() =>
                  publish.mutate(
                    { examId },
                    {
                      onSuccess: () => { toast({ title: "Results published" }); refetch(); },
                      onError: (error) => toast({ title: "Publish failed", description: error.message, variant: "destructive" }),
                    },
                  )
                }
              >
                Publish Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle>Result List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {results?.map((result) => (
            <div key={result.id} className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="text-sm font-semibold">
                {result.studentName} ({result.studentRollNo})
              </p>
              <p className="text-xs text-muted-foreground">
                Marks: {result.marksObtained}/{result.totalMarks} | Grade: {result.grade} | Percentage:{" "}
                {result.percentage}% | Rank: {result.rank ?? "-"}
              </p>
              <div className="mt-2">
                <a href={`/api/results/${result.id}/pdf?token=${encodeURIComponent(localStorage.getItem("exam_auth_token") ?? "")}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">Download Marksheet PDF</Button>
                </a>
              </div>
            </div>
          ))}
          {!results?.length && <p className="text-sm text-muted-foreground">No results found.</p>}
        </CardContent>
      </Card>

      {/* Plagiarism Detection — admin/teacher only */}
      {canManage && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ScanSearch className="h-4 w-4" />
                  Plagiarism Detection
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compares MCQ answer patterns between students — flags pairs with 80%+ identical answers
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={examId <= 0 || plagLoading}
                onClick={handlePlagCheck}
                className="rounded-xl shrink-0"
              >
                {plagLoading ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Checking...</>
                ) : (
                  <><ScanSearch className="mr-1.5 h-3.5 w-3.5" />Run Check</>
                )}
              </Button>
            </div>
          </CardHeader>

          {plagResult && (
            <CardContent className="pt-0 space-y-3">
              <Separator />
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">
                  Pairs analyzed: <strong>{plagResult.totalPairs}</strong>
                </span>
                <span className={plagResult.flaggedPairs > 0 ? "text-destructive font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                  Flagged: {plagResult.flaggedPairs}
                </span>
              </div>

              {plagResult.message && !plagResult.suspicious.length && (
                <p className="text-sm text-muted-foreground">{plagResult.message}</p>
              )}

              {plagResult.suspicious.length > 0 && (
                <div className="space-y-2">
                  {plagResult.suspicious.map((pair, i) => (
                    <div key={i} className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">
                              {pair.student1.name}
                              <span className="text-muted-foreground font-normal text-xs ml-1">({pair.student1.rollNo})</span>
                              <span className="mx-1.5 text-muted-foreground">vs</span>
                              {pair.student2.name}
                              <span className="text-muted-foreground font-normal text-xs ml-1">({pair.student2.rollNo})</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {pair.matchedQuestions}/{pair.totalCompared} identical answers
                              {(pair.student1.tabSwitches > 0 || pair.student2.tabSwitches > 0) && (
                                <span className="ml-2 text-amber-600 dark:text-amber-400">
                                  · Tab switches: {pair.student1.name.split(" ")[0]} {pair.student1.tabSwitches}, {pair.student2.name.split(" ")[0]} {pair.student2.tabSwitches}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          "text-xs font-bold shrink-0",
                          pair.similarity >= 95 ? "bg-destructive text-destructive-foreground" :
                          "border-destructive/40 bg-destructive/10 text-destructive"
                        )}>
                          {pair.similarity}% match
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {plagResult.suspicious.length === 0 && plagResult.totalPairs > 0 && !plagResult.message && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                  No suspicious answer patterns detected across {plagResult.totalPairs} student pair{plagResult.totalPairs !== 1 ? "s" : ""}.
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
