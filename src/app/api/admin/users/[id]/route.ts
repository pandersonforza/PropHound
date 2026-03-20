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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, email, role, password } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  // Check for duplicate email (excluding current user)
  const existing = await prisma.user.findFirst({
    where: { email, id: { not: id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const updateData: Record<string, string> = { name, email, role: role || "user" };
  if (password && password.length >= 6) {
    updateData.passwordHash = hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
