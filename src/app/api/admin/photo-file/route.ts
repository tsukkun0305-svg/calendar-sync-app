import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");
    const filename = searchParams.get("filename");

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    if (!filename) {
      return NextResponse.json({ error: "ファイル名が必要です" }, { status: 400 });
    }

    // Prevent path traversal
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (safeName !== filename || filename.includes("..")) {
      return NextResponse.json({ error: "無効なファイル名です" }, { status: 400 });
    }

    const ext = safeName.split(".").pop()?.toLowerCase() || "";
    const allowed = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "対応していないファイル形式です" }, { status: 400 });
    }

    const mediaTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };

    const filePath = join(process.cwd(), "uploads", safeName);
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": mediaTypeMap[ext] || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
