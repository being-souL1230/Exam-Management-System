import { useCallback, useEffect, useMemo, useState } from "react";
import "@/components/ui/dashboard-stat-card.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Role = "admin" | "teacher" | "student";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  assignedSubjects: string[];
}

interface AuditEntry {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
}

interface ReportsOverview {
  users: {
    active: number;
    inactive: number;
    byRole: { admin: number; teacher: number; student: number };
  };
  exams: { draft: number };
  results: { published: number; pending: number };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("exam_auth_token");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return response.json() as Promise<T>;
}

export default function AdminControl() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    username: "",
    email: "",
    password: "",
    role: "student" as Role,
  });
  const [subjectsUser, setSubjectsUser] = useState<AdminUser | null>(null);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [u, l, s, r] = await Promise.all([
        apiRequest<AdminUser[]>("/api/admin/users"),
        apiRequest<AuditEntry[]>("/api/admin/audit-logs?limit=100"),
        apiRequest<Record<string, string>>("/api/admin/settings"),
        apiRequest<ReportsOverview>("/api/admin/reports/overview"),
      ]);
      setUsers(u);
      setLogs(l);
      setSettings(s);
      setReports(r);
    } catch (error) {
      toast({
        title: "Failed to load admin controls",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (activeFilter !== "all" && String(user.isActive) !== activeFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        return user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
      }
      return true;
    });
  }, [users, search, roleFilter, activeFilter]);

  const updateUserRole = async (userId: number, role: Role) => {
    try {
      const updated = await apiRequest<AdminUser>(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: "Role updated" });
    } catch (error) {
      toast({
        title: "Role update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: number, nextStatus: boolean) => {
    try {
      const updated = await apiRequest<AdminUser>(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus }),
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: nextStatus ? "User activated" : "User deactivated" });
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const createUser = async () => {
    try {
      const created = await apiRequest<AdminUser>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });
      setUsers((prev) => [created, ...prev]);
      setCreatePayload({ username: "", email: "", password: "", role: "student" });
      setIsCreateOpen(false);
      toast({ title: "User created successfully" });
    } catch (error) {
      toast({
        title: "Create user failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const openSubjectsDialog = (user: AdminUser) => {
    setSubjectsUser(user);
    setSubjectsList(user.assignedSubjects ?? []);
    setSubjectInput("");
  };

  const addSubject = () => {
    const s = subjectInput.trim();
    if (!s || subjectsList.includes(s)) return;
    setSubjectsList((prev) => [...prev, s]);
    setSubjectInput("");
  };

  const removeSubject = (s: string) => setSubjectsList((prev) => prev.filter((x) => x !== s));

  const saveSubjects = async () => {
    if (!subjectsUser) return;
    try {
      const updated = await apiRequest<AdminUser & { assignedSubjects: string[] }>(
        `/api/admin/users/${subjectsUser.id}/subjects`,
        { method: "PATCH", body: JSON.stringify({ subjects: subjectsList }) }
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, assignedSubjects: updated.assignedSubjects } : u)));
      setSubjectsUser(null);
      toast({ title: "Subjects updated" });
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key, value }),
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast({ title: "Setting saved" });
    } catch (error) {
      toast({
        title: "Setting save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell space-y-3">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Control Center</h2>
          <p className="page-subtitle">Global user access, system settings, audit and compliance controls.</p>
        </div>
        <Button size="sm" onClick={() => void loadAll()}>
          Refresh Data
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Users" value={reports?.users.active ?? 0} />
        <StatCard label="Inactive Users" value={reports?.users.inactive ?? 0} />
        <StatCard label="Faculty" value={reports?.users.byRole.teacher ?? 0} />
        <StatCard label="Draft Exams" value={reports?.exams.draft ?? 0} />
        <StatCard label="Published Results" value={reports?.results.published ?? 0} />
      </div>

      <Tabs defaultValue="users" className="space-y-3">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Users & Access Control</CardTitle>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Create User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create User</DialogTitle>
                      <DialogDescription>Create admin, faculty or student account.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Username"
                        value={createPayload.username}
                        onChange={(e) => setCreatePayload((p) => ({ ...p, username: e.target.value }))}
                      />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={createPayload.email}
                        onChange={(e) => setCreatePayload((p) => ({ ...p, email: e.target.value }))}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={createPayload.password}
                        onChange={(e) => setCreatePayload((p) => ({ ...p, password: e.target.value }))}
                      />
                      <Select value={createPayload.role} onValueChange={(value) => setCreatePayload((p) => ({ ...p, role: value as Role }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="teacher">Faculty</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => void createUser()}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <Input placeholder="Search by username or email" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | Role)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Faculty</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as "all" | "true" | "false")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(value) => void updateUserRole(user.id, value as Role)}>
                          <SelectTrigger className="h-8 w-[126px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="teacher">Faculty</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "secondary" : "destructive"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[350px]">
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.slice(0, 3).map((permission) => (
                            <Badge key={permission} variant="outline" className="text-[10px]">
                              {permission}
                            </Badge>
                          ))}
                          {user.permissions.length > 3 && <Badge variant="outline">+{user.permissions.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.role === "teacher" && (
                            <Button size="sm" variant="outline" onClick={() => openSubjectsDialog(user)}>
                              Subjects
                            </Button>
                          )}
                          <Button size="sm" variant={user.isActive ? "outline" : "default"} onClick={() => void toggleUserStatus(user.id, !user.isActive)}>
                            {user.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(settings).map(([key, value], index) => (
                <div key={key}>
                  <div className="grid gap-2 md:grid-cols-[240px_1fr_auto] md:items-center">
                    <div>
                      <Label className="text-sm font-medium">{key}</Label>
                    </div>
                    <Input
                      value={value}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => void updateSetting(key, settings[key])}>
                      Save
                    </Button>
                  </div>
                  {index < Object.keys(settings).length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Audit Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {logs.length === 0 && <p className="text-sm text-muted-foreground">No audit activity found.</p>}
              {logs.map((entry, index) => (
                <div key={entry.id}>
                  <div className="grid gap-1 py-2 text-sm md:grid-cols-[170px_1fr_170px]">
                    <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                    <span>
                      <strong>{entry.action}</strong> on {entry.entity}
                      {entry.entityId ? ` #${entry.entityId}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground md:text-right">{entry.actorEmail ?? "system"}</span>
                  </div>
                  {index < logs.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Teacher Subjects Dialog */}
      <Dialog open={!!subjectsUser} onOpenChange={(open) => { if (!open) setSubjectsUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subjects — {subjectsUser?.username}</DialogTitle>
            <DialogDescription>
              This teacher will only see and create exams for these subjects. Leave empty to allow all subjects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Mathematics"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
              />
              <Button type="button" onClick={addSubject} variant="outline">Add</Button>
            </div>
            {subjectsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned — teacher can access all.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subjectsList.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1.5 pr-1 text-sm">
                    {s}
                    <button
                      onClick={() => removeSubject(s)}
                      className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
                      aria-label={`Remove ${s}`}
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectsUser(null)}>Cancel</Button>
            <Button onClick={() => void saveSubjects()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="dsc-card">
      <div className="dsc-top">
        <p className="dsc-label">{label}</p>
        <p className="dsc-value">{value}</p>
      </div>
    </div>
  );
}
