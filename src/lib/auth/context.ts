import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationDeniedError";
  }
}

export interface AuthAssignment {
  roleCode: string;
  chapterId: string | null;
  permissions: string[];
}

export interface AuthContext {
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  assignments: AuthAssignment[];
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const now = new Date();
  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId: user.id,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    select: {
      chapterId: true,
      role: {
        select: {
          code: true,
          permissions: {
            select: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  });

  return {
    user,
    assignments: assignments.map((assignment) => ({
      roleCode: assignment.role.code,
      chapterId: assignment.chapterId,
      permissions: assignment.role.permissions.map(
        (entry) => entry.permission.code,
      ),
    })),
  };
}

export function hasPermission(
  context: AuthContext,
  permissionCode: string,
  chapterId?: string | null,
) {
  return context.assignments.some((assignment) => {
    if (!assignment.permissions.includes(permissionCode)) return false;

    // National-scoped assignments can authorize permitted cross-chapter actions.
    if (assignment.chapterId === null) return true;

    // Chapter-scoped assignments only authorize the exact chapter requested.
    return Boolean(chapterId) && assignment.chapterId === chapterId;
  });
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) throw new AuthenticationRequiredError();
  return context;
}

export async function requirePermission(
  permissionCode: string,
  chapterId?: string | null,
) {
  const context = await requireAuthContext();
  if (!hasPermission(context, permissionCode, chapterId)) {
    throw new AuthorizationDeniedError();
  }
  return context;
}

export function authorizedChapterIds(
  context: AuthContext,
  permissionCode: string,
) {
  const national = context.assignments.some(
    (assignment) =>
      assignment.chapterId === null &&
      assignment.permissions.includes(permissionCode),
  );

  if (national) return null;

  return Array.from(
    new Set(
      context.assignments
        .filter(
          (assignment) =>
            assignment.chapterId !== null &&
            assignment.permissions.includes(permissionCode),
        )
        .map((assignment) => assignment.chapterId as string),
    ),
  );
}
