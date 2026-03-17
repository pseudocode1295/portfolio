import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET!;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!; // bcrypt hash of your password

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 });

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "7d" });

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_token");
  return res;
}
