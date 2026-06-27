import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, email, reason } = body;

    if (!filename || !email) {
      return NextResponse.json({ error: "ファイル名とメールアドレスは必須です" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
    }

    const requestData = {
      filename,
      email,
      reason: reason || "",
      requestedAt: new Date().toISOString(),
    };

    const requestsDir = join(process.cwd(), "uploads", "deletion-requests");
    const { mkdir } = await import("fs/promises");
    await mkdir(requestsDir, { recursive: true });

    const requestFilename = `${Date.now()}-${email.replace(/[^a-z0-9]/gi, "_")}.json`;
    await writeFile(join(requestsDir, requestFilename), JSON.stringify(requestData, null, 2));

    return NextResponse.json({ success: true, message: "削除リクエストを受け付けました。確認後、対応いたします。" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
