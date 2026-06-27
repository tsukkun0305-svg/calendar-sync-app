"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

type DiagnosisResult = {
  animal: string;
  reason: string;
  compatibility: string;
  score: number;
  savedUrl: string;
};

type Step = "input" | "camera" | "loading" | "result";

const ANIMAL_EMOJIS: Record<string, string> = {
  犬: "🐶", 猫: "🐱", うさぎ: "🐰", 熊: "🐻", キツネ: "🦊", 狼: "🐺",
  ライオン: "🦁", 虎: "🐯", チーター: "🐆", パンダ: "🐼", コアラ: "🐨",
  フクロウ: "🦉", イルカ: "🐬", 馬: "🐴", 鹿: "🦌", 羊: "🐑",
  ペンギン: "🐧", ゴリラ: "🦍", チンパンジー: "🐒", サル: "🐒",
  ゾウ: "🐘", キリン: "🦒", ヒョウ: "🐆", ネコ: "🐱",
};

function getAnimalEmoji(animal: string): string {
  for (const [key, emoji] of Object.entries(ANIMAL_EMOJIS)) {
    if (animal.includes(key)) return emoji;
  }
  return "🐾";
}

export default function AnimalDiagnosisPage() {
  const [step, setStep] = useState<Step>("input");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "カメラへのアクセスができませんでした";
      setCameraError(
        msg.includes("NotAllowed") || msg.includes("Permission")
          ? "カメラへのアクセスが拒否されました。ブラウザの設定で許可してください。"
          : "カメラを起動できませんでした。別の方法で写真をアップロードしてください。"
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (step === "camera") {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, facingMode, startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(canvas.toDataURL("image/jpeg", 0.9));
      stopCamera();
      setStep("input");
    }, "image/jpeg", 0.9);
  }, [facingMode, stopCamera]);

  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = async () => {
    if (!imageFile || !consent) return;
    setStep("loading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("consent", "true");
      const res = await fetch("/api/animal-diagnosis", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "診断に失敗しました");
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("input");
    setImagePreview(null);
    setImageFile(null);
    setConsent(false);
    setResult(null);
    setError(null);
    setShowDeleteForm(false);
    setDeleteStatus(null);
    setCameraError(null);
  };

  const handleDeleteRequest = async () => {
    if (!result || !deleteEmail) return;
    try {
      const res = await fetch("/api/animal-diagnosis/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedUrl: result.savedUrl, email: deleteEmail, reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteStatus(data.message);
    } catch (err) {
      setDeleteStatus(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // ── カメラ画面 ──────────────────────────────────────────
  if (step === "camera") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setStep("input")} className="text-white text-sm px-3 py-1.5 rounded-lg bg-white/20">
            ← 戻る
          </button>
          <span className="text-white text-sm font-medium">カメラ撮影</span>
          <button
            onClick={() => setFacingMode((m) => m === "user" ? "environment" : "user")}
            className="text-white text-sm px-3 py-1.5 rounded-lg bg-white/20"
          >
            🔄 切替
          </button>
        </div>

        {cameraError ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-white text-sm mb-6">{cameraError}</p>
            <button onClick={() => setStep("input")} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium">
              アップロードに切り替え
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              {/* 顔ガイド枠 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-72 rounded-full border-2 border-white/60 border-dashed" />
              </div>
            </div>

            <div className="flex items-center justify-center py-8 bg-black">
              <button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform shadow-xl"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // ── メイン画面 ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-gray-800">動物顔診断</h1>
          <p className="text-gray-500 mt-1 text-sm">あなたの顔に似ている動物を診断します</p>
        </div>

        {/* Input Step */}
        {step === "input" && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            {/* 画像選択エリア */}
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="プレビュー" className="w-full h-64 object-cover rounded-xl" />
                <button
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* カメラボタン */}
                <button
                  onClick={() => setStep("camera")}
                  className="w-full py-4 rounded-xl border-2 border-orange-300 text-orange-600 font-semibold flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
                >
                  📷 カメラで撮影
                </button>

                {/* アップロードエリア */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="text-3xl mb-1">🖼️</div>
                  <p className="text-gray-500 text-sm">クリックまたはドラッグで画像を選択</p>
                  <p className="text-gray-400 text-xs mt-0.5">JPG, PNG, GIF, WebP 対応</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
                  />
                </div>
              </div>
            )}

            {/* プライバシー説明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-600">
              <p className="font-medium text-amber-800 mb-1">📋 個人情報の取り扱いについて</p>
              <p className="text-xs leading-relaxed">
                アップロードされた写真はAI診断に使用されるほか、サービス改善のためサーバーに保存されます。
                収集した情報は第三者に販売・提供しません。詳細は
                <Link href="/privacy-policy" className="text-blue-600 underline mx-1" target="_blank">
                  プライバシーポリシー
                </Link>
                をご確認ください。
              </p>
            </div>

            {/* 同意チェック */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-orange-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-gray-700">
                <Link href="/privacy-policy" className="text-blue-600 underline" target="_blank">
                  プライバシーポリシー
                </Link>
                を読み、写真の収集・保存に同意します
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!imageFile || !consent}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600 active:scale-95"
            >
              🔍 動物診断スタート
            </button>
          </div>
        )}

        {/* Loading Step */}
        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-md p-10 text-center">
            <div className="text-5xl mb-4 animate-bounce">🔍</div>
            <p className="text-gray-600 font-medium">AIが診断中です...</p>
            <p className="text-gray-400 text-sm mt-1">少々お待ちください</p>
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && result && (
          <div className="space-y-4">
            {imagePreview && (
              <img src={imagePreview} alt="診断した写真" className="w-full h-48 object-cover rounded-2xl shadow-md" />
            )}
            <div className="bg-white rounded-2xl shadow-md p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">あなたが似ている動物は...</p>
              <div className="text-7xl mb-2">{getAnimalEmoji(result.animal)}</div>
              <h2 className="text-3xl font-bold text-orange-600 mb-1">{result.animal}</h2>
              <div className="flex justify-center items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">診断スコア</span>
                <div className="bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1 rounded-full">
                  {result.score}%
                </div>
              </div>
              <div className="text-left space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">似ている理由</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{result.reason}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">特徴・相性</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{result.compatibility}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 space-y-3">
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl font-medium text-orange-600 border-2 border-orange-300 hover:bg-orange-50 transition-colors"
              >
                🔄 もう一度診断する
              </button>

              {result.savedUrl && (
                <button
                  onClick={() => setShowDeleteForm(!showDeleteForm)}
                  className="w-full py-2.5 rounded-xl font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  🗑️ 写真の削除リクエスト
                </button>
              )}

              {showDeleteForm && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  {deleteStatus ? (
                    <p className="text-sm text-green-600 text-center">{deleteStatus}</p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">確認後、7営業日以内に対応いたします。</p>
                      <input
                        type="email"
                        placeholder="メールアドレス（必須）"
                        value={deleteEmail}
                        onChange={(e) => setDeleteEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                      <textarea
                        placeholder="削除理由（任意）"
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                      />
                      <button
                        onClick={handleDeleteRequest}
                        disabled={!deleteEmail}
                        className="w-full py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        削除リクエストを送信
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-400 space-x-3">
          <Link href="/privacy-policy" className="hover:text-gray-600 underline">プライバシーポリシー</Link>
          <span>|</span>
          <Link href="/" className="hover:text-gray-600">ホームへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
