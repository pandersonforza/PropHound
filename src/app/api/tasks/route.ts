import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const taskIncludes = {
  project: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id };
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: taskIncludes,
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate, projectId, assigneeId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // If assigneeId provided, assign to that user; otherwise assign to self
    const targetUserId = assigneeId || user.id;

    // Verify the target user exists if assigning to someone else
    if (assigneeId && assigneeId !== user.id) {
      const targetUser = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!targetUser) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: targetUserId,
        createdById: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
      },
      include: taskIncludes,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
