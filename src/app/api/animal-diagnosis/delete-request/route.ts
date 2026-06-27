import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { savedUrl, email, reason } = body;

    if (!email) {
      return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
    }

    // Log the deletion request (in production, send email or write to DB)
    console.log("Deletion request:", { savedUrl, email, reason, requestedAt: new Date().toISOString() });

    // If using Vercel Blob, delete it immediately
    if (savedUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import("@vercel/blob");
        await del(savedUrl);
        return NextResponse.json({ success: true, message: "写真を削除しました。" });
      } catch (e) {
        console.error("Blob deletion failed:", e);
      }
    }

    return NextResponse.json({ success: true, message: "削除リクエストを受け付けました。確認後、対応いたします。" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
