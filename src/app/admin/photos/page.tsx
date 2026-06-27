"use client";

import { useState, useEffect } from "react";

type Photo = {
  filename: string;
  uploadedAt: string;
  size: number;
};

export default function AdminPhotosPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const fetchPhotos = async (pwd: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/photos?password=${encodeURIComponent(pwd)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }
      setPhotos(data.photos || []);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotos(password);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">管理者：写真一覧</h1>

        {!authenticated ? (
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm mx-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">認証</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={!password || loading}
                className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "確認中..." : "ログイン"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-600 text-sm">
                合計 <span className="font-bold text-gray-800">{photos.length}</span> 枚
              </p>
              <button
                onClick={() => fetchPhotos(password)}
                className="text-sm text-blue-600 hover:underline"
              >
                更新
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-10 text-center text-gray-400">
                写真がまだありません
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.filename} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <img
                      src={`/api/admin/photo-file?filename=${encodeURIComponent(photo.filename)}&password=${encodeURIComponent(password)}`}
                      alt={photo.filename}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                    <div className="p-2">
                      <p className="text-xs text-gray-500">{formatDate(photo.uploadedAt)}</p>
                      <p className="text-xs text-gray-400">{formatSize(photo.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
