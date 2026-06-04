export const ROLE_PERMISSIONS = {
  admin: [
    "users.manage",
    "roles.manage",
    "users.deactivate",
    "system.settings.manage",
    "exams.global.manage",
    "results.final.publish",
    "results.lock.manage",
    "results.reeval.approve",
    "audit.view",
    "reports.view",
    "access.manage",
  ],
  teacher: [
    "students.manage",
    "exams.manage.own",
    "questions.manage.own",
    "results.calculate",
    "results.grade",
  ],
  student: [
    "exam.attempt",
    "results.view.self",
  ],
} as const;

export type RoleName = keyof typeof ROLE_PERMISSIONS;
export type PermissionName = (typeof ROLE_PERMISSIONS)[RoleName][number];

export function getRolePermissions(role: string): string[] {
  if (role === "admin" || role === "teacher" || role === "student") {
    return [...ROLE_PERMISSIONS[role]];
  }
  return [];
}

export function hasPermission(role: string, permission: string): boolean {
  return getRolePermissions(role).includes(permission);
}
