import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          assignedTasks: true,
          approvedInvoices: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, role, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role || "user",
      passwordHash: hashPassword(password),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
