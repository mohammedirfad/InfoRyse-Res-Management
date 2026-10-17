import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE = "inforyse_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

export type SessionPayload = {
  userId: string;
  role: "SUPER_ADMIN" | "OWNER" | "STAFF";
  restaurantId: string | null;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// --- Session cookie (HTTP-only, signed JWT) ---------------------------------

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null; // expired or tampered — treat as logged out
  }
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

// --- Email OTP (free, self-hosted — no paid SMS/auth SaaS) ------------------

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

export async function issueOtp(userId: string, purpose: string, userEmail?: string) {
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const isPasswordReset = purpose === "PASSWORD_RESET";
  const ttlMs = isPasswordReset ? 15 * 60 * 1000 : 5 * 60 * 1000;

  await db.otpCode.create({
    data: {
      userId,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  if (userEmail) {
    // Import dynamically or dispatch email
    import("@/lib/email").then(({ sendEmail, buildOtpEmailHtml, buildPasswordResetEmailHtml }) => {
      if (isPasswordReset) {
        sendEmail({
          to: userEmail,
          subject: `Your InfoRyse Password Reset Code: ${code}`,
          html: buildPasswordResetEmailHtml({ code, email: userEmail }),
          text: `Your InfoRyse password reset code is: ${code}. It expires in 15 minutes.`,
        }).catch((err) => console.error("[Auth:Password Reset Email]", err));
      } else {
        sendEmail({
          to: userEmail,
          subject: `Your InfoRyse Verification Code: ${code}`,
          html: buildOtpEmailHtml({ code }),
          text: `Your InfoRyse verification code is: ${code}. It expires in 5 minutes.`,
        }).catch((err) => console.error("[Auth:OTP Email]", err));
      }
    });
  }

  return code;
}

export async function verifyOtp(userId: string, purpose: string, submitted: string) {
  const record = await db.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  const ok = await bcrypt.compare(submitted, record.codeHash);
  if (!ok) return false;
  await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}
