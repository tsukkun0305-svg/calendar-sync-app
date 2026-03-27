import { NextResponse } from "next/server";
import { getTasksClient } from "@/lib/google-tasks";

export async function GET() {
  try {
    const tasksClient = await getTasksClient();
    
    // デフォルトのタスクリスト（@default）から未完了のタスクを取得
    const response = await tasksClient.tasks.list({
      tasklist: "@default",
      maxResults: 50,
      showCompleted: false,
    });

    return NextResponse.json({ tasks: response.data.items || [] });
  } catch (error: any) {
    console.error("Tasks API Error (GET):", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tasks" }, { status: 500 });
  }
}
