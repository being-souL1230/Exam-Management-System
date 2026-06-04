import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Search, Trash2, RotateCcw, CheckCircle, MinusCircle, Banknote } from "lucide-react";

type FeeRecord = {
  id: number;
  studentId: number;
  studentName: string;
  studentRollNo: string;
  amount: number;
  description: string;
  dueDate: string | null;
  status: "pending" | "paid" | "waived";
  createdAt: string;
};

type StudentSummary = { id: number; name: string; rollNo: string; course: string };

const STATUS_BADGE: Record<string, string> = {
  pending: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  paid:    "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  waived:  "border-slate-300/50 bg-slate-50 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("exam_auth_token");
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Request failed"); }
  return res.json();
}

function StatCard({
  label, value, sub,
}: {
  label: string; value: string; sub?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-card p-5"
      style={{
        boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="text-[11px] mt-1 text-muted-foreground font-medium">{sub}</p>}
    </div>
  );
}

export default function FeesPage() {
  const { toast } = useToast();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ studentId: "", amount: "", description: "", dueDate: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api<FeeRecord[]>("/api/fees"),
      api<{ students: StudentSummary[] }>("/api/students?limit=500"),
    ]).then(([f, s]) => {
      setFees(f);
      setStudents(s.students);
    }).catch((e) => toast({ title: "Load failed", description: e.message, variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = fees;
    if (statusFilter !== "all") list = list.filter((f) => f.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) =>
        f.studentName.toLowerCase().includes(q) ||
        f.studentRollNo.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [fees, statusFilter, search]);

  const totalPending = fees.filter((f) => f.status === "pending").reduce((s, f) => s + f.amount, 0);
  const totalPaid    = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const totalWaived  = fees.filter((f) => f.status === "waived").reduce((s, f) => s + f.amount, 0);
  const studentsWithDues = new Set(fees.filter((f) => f.status === "pending").map((f) => f.studentId)).size;
  const collectionRate = totalPaid + totalPending > 0
    ? Math.round((totalPaid / (totalPaid + totalPending)) * 100)
    : 0;

  const handleAdd = async () => {
    if (!form.studentId || !form.amount || !form.description) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await api("/api/fees", {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(form.studentId),
          amount: Number(form.amount),
          description: form.description,
          dueDate: form.dueDate || null,
        }),
      });
      toast({ title: "Fee record added" });
      setAddOpen(false);
      setForm({ studentId: "", amount: "", description: "", dueDate: "" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api(`/api/fees/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setFees((prev) => prev.map((f) => f.id === id ? { ...f, status: status as any } : f));
      toast({ title: `Marked as ${status}` });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const deleteFee = async (id: number) => {
    try {
      const token = localStorage.getItem("exam_auth_token");
      await fetch(`/api/fees/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setFees((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Fee record removed" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Fee &amp; Dues Tracker</h2>
          <p className="page-subtitle">Manage student fee records. Pending dues will block exam access.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl gap-1.5">
          <Plus className="h-4 w-4" />
          Add Fee Record
        </Button>
      </div>

      {/* Summary cards with 3D depth */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Dues"
          value={`₹${totalPending.toLocaleString()}`}
          sub={`${fees.filter((f) => f.status === "pending").length} records`}
        />
        <StatCard
          label="Collected"
          value={`₹${totalPaid.toLocaleString()}`}
          sub={`${fees.filter((f) => f.status === "paid").length} records`}
        />
        <StatCard
          label="Students with Dues"
          value={String(studentsWithDues)}
          sub="unique students"
        />
        <StatCard
          label="Collection Rate"
          value={`${collectionRate}%`}
          sub={`₹${totalWaived.toLocaleString()} waived`}
        />
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 rounded-lg bg-background"
              placeholder="Search by student name, roll no or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 rounded-lg bg-background">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} of {fees.length} records
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("px-5 py-4", i !== 4 && "border-b border-border/40")}>
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No fee records found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Roll No
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 border-l border-border/30">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fee, idx) => (
                  <tr
                    key={fee.id}
                    className={cn(
                      "group transition-colors hover:bg-muted/20",
                      idx !== filtered.length - 1 && "border-b border-border/40"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold">{fee.studentName}</span>
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20">
                      <span className="text-xs text-muted-foreground font-mono">{fee.studentRollNo}</span>
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20 max-w-[220px]">
                      <span className="text-sm text-foreground/80 line-clamp-1">{fee.description}</span>
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20 whitespace-nowrap">
                      {fee.dueDate ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(fee.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">No due date</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20">
                      <Badge className={cn("text-[10px] border capitalize px-2 py-0.5", STATUS_BADGE[fee.status])}>
                        {fee.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20 text-right">
                      <span className="text-sm font-bold tabular-nums">₹{fee.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 border-l border-border/20">
                      <div className="flex items-center justify-center gap-1">
                        {fee.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[11px] rounded-lg gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              onClick={() => updateStatus(fee.id, "paid")}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2.5 text-[11px] rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => updateStatus(fee.id, "waived")}
                            >
                              <MinusCircle className="h-3 w-3" />
                              Waive
                            </Button>
                          </>
                        )}
                        {fee.status !== "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2.5 text-[11px] rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => updateStatus(fee.id, "pending")}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 px-0 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteFee(fee.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-border/60 bg-muted/30">
                  <td colSpan={5} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Total ({filtered.length} records shown)
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-sm border-l border-border/30">
                    ₹{filtered.reduce((s, f) => s + f.amount, 0).toLocaleString()}
                  </td>
                  <td className="border-l border-border/30" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Fee Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm((p) => ({ ...p, studentId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.rollNo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Semester fee, Lab fee..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Add Fee Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
