import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    const uploadsDir = join(process.cwd(), "uploads");

    let files: string[];
    try {
      files = await readdir(uploadsDir);
    } catch {
      return NextResponse.json({ photos: [] });
    }

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const imageFiles = files.filter((f) => {
      const ext = f.split(".").pop()?.toLowerCase() || "";
      return imageExtensions.includes(ext);
    });

    const photoList = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = join(uploadsDir, filename);
        const stats = await stat(filePath);
        return {
          filename,
          uploadedAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      })
    );

    photoList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ photos: photoList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
