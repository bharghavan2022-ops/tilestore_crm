import crypto from "node:crypto";
import ms from "../../lib/ms";
import { prisma } from "../../lib/prisma";
import { comparePassword, hashPassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { UnauthorizedError } from "../../lib/errors";
import { env } from "../../config/env";
import { recordAudit } from "../../lib/audit";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(user: {
  id: string;
  role: "OWNER" | "ADMIN" | "TEAM_LEAD" | "TEAM_MEMBER" | "CLIENT";
  teamId: string | null;
  customerId: string | null;
}): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    teamId: user.teamId,
    customerId: user.customerId,
  });

  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_TTL)),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic error whether the email doesn't exist or the password is
  // wrong, so login can't be used to enumerate registered accounts.
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const tokens = await issueTokenPair(user);
  await recordAudit(prisma, {
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
  });

  return tokens;
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.userId !== payload.sub) {
    throw new UnauthorizedError("Invalid refresh token");
  }
  if (stored.revokedAt) {
    // Reuse of an already-rotated-out refresh token: treat as compromise
    // and revoke every outstanding token for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Refresh token has already been used");
  }
  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError("Account is not active");
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return issueTokenPair(user);
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Current password is incorrect");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    // Force re-login everywhere once the password changes.
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordAudit(tx, {
      userId,
      entityType: "User",
      entityId: userId,
      action: "PASSWORD_CHANGED",
    });
  });
}
