import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile } from "fs/promises";
import { join } from "path";

const client = new Anthropic();

const ANIMALS = [
  "犬", "猫", "うさぎ", "熊", "キツネ", "狼", "ライオン", "虎", "チーター",
  "パンダ", "コアラ", "フクロウ", "イルカ", "馬", "鹿", "羊", "ペンギン",
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const consent = formData.get("consent");

    if (!imageFile) {
      return NextResponse.json({ error: "画像が見つかりません" }, { status: 400 });
    }

    if (consent !== "true") {
      return NextResponse.json({ error: "同意が必要です" }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
    }

    const mediaTypeMap: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const mediaType = mediaTypeMap[ext] || "image/jpeg";

    // Save photo (local: uploads/, Vercel: /tmp/uploads/)
    const timestamp = Date.now();
    const filename = `${timestamp}.${ext}`;
    let savedFilename = filename;
    try {
      const { mkdir } = await import("fs/promises");
      const uploadsDir = process.env.VERCEL
        ? join("/tmp", "uploads")
        : join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(join(uploadsDir, filename), buffer);
    } catch {
      // Filesystem not writable — diagnosis still works, photo not saved
      savedFilename = "";
    }

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `この写真に写っている人の顔を見て、どの動物に似ているか診断してください。

以下の形式でJSONのみで回答してください（他のテキストは不要）：
{
  "animal": "動物名（日本語で1種類）",
  "reason": "似ている理由（2〜3文で具体的に）",
  "compatibility": "その動物との相性や特徴（1〜2文）",
  "score": 診断の確信度（1〜100の整数）
}

候補動物例: ${ANIMALS.join("、")}
これ以外の動物でも構いません。最もよく似ている動物を選んでください。`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "診断結果を取得できませんでした" }, { status: 500 });
    }

    let result;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return NextResponse.json({ error: "診断結果の解析に失敗しました" }, { status: 500 });
    }

    if (!result) {
      return NextResponse.json({ error: "診断結果を解析できませんでした" }, { status: 500 });
    }

    return NextResponse.json({
      animal: result.animal,
      reason: result.reason,
      compatibility: result.compatibility,
      score: result.score,
      filename: savedFilename,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
