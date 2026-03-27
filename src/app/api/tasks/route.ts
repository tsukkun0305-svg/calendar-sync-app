import { NextResponse } from "next/server";
import { getTasksClient } from "@/lib/google-tasks";

export async function GET() {
  try {
    const tasksClient = await getTasksClient();
    
    // 全てのタスクリストを取得
    const listsRes = await tasksClient.tasklists.list();
    const taskLists = listsRes.data.items || [];
    
    let allTasks: any[] = [];
    
    // 各リストから未完了のタスクを一括取得
    for (const list of taskLists) {
      if (!list.id) continue;
      const response = await tasksClient.tasks.list({
        tasklist: list.id,
        maxResults: 100,
        showCompleted: false,
      });
      if (response.data.items) {
        allTasks = [...allTasks, ...response.data.items];
      }
    }

    return NextResponse.json({ tasks: allTasks });
  } catch (error: any) {
    console.error("Tasks API Error (GET):", error);
    return NextResponse.json({ error: error.message || "Failed to fetch tasks" }, { status: 500 });
  }
}
