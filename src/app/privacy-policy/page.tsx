"use client";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mb-8">最終更新日：2026年6月27日</p>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">1. 収集する情報</h2>
          <p className="text-gray-600 leading-relaxed">
            当サービス（動物顔診断）では、診断機能を提供するために、ユーザーが任意にアップロードまたは撮影した顔写真を収集します。
            収集された画像データは、AI診断処理のためにAnthropicのAPIに送信されます。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">2. 情報の利用目的</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>動物顔診断サービスの提供</li>
            <li>サービス品質の改善・研究開発</li>
            <li>サービスの利用状況の分析</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">3. 情報の保存</h2>
          <p className="text-gray-600 leading-relaxed">
            アップロードされた画像はサーバー内の安全なフォルダに保存されます。
            これらの画像はサービス改善目的でのみ使用され、第三者への販売・提供は行いません。
            画像の保存期間は原則として1年間とし、その後は削除します。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">4. 第三者への提供</h2>
          <p className="text-gray-600 leading-relaxed">
            収集した個人情報は、以下の場合を除き第三者に提供しません：
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>AI診断処理のためAnthropicへのAPI送信（データ処理業務委託）</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">5. 画像の削除請求</h2>
          <p className="text-gray-600 leading-relaxed">
            ユーザーはいつでも自身がアップロードした画像の削除を請求することができます。
            削除請求は動物診断結果ページの「画像削除リクエスト」フォームからお申し込みください。
            受付後、速やかに対応いたします（原則7営業日以内）。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">6. 個人情報の安全管理</h2>
          <p className="text-gray-600 leading-relaxed">
            収集した個人情報の漏洩・滅失・毀損を防止するため、適切な安全管理措置を講じます。
            個人情報を取り扱う従業者への適切な監督を行います。
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">7. お問い合わせ</h2>
          <p className="text-gray-600 leading-relaxed">
            個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
          </p>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
            <p>メール：oishi@imk-holdings.co.jp</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">8. 適用法令</h2>
          <p className="text-gray-600 leading-relaxed">
            本プライバシーポリシーは、個人情報の保護に関する法律（個人情報保護法）に基づき策定されています。
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/animal-diagnosis" className="text-blue-600 hover:underline text-sm">
            ← 動物顔診断に戻る
          </a>
        </div>
      </div>
    </div>
  );
}
