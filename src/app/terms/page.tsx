import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-brand-white p-6">
      <div className="max-w-md mx-auto">
        <Link href="/login" className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← BACK
        </Link>

        <div className="mt-6 mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[3px] text-gray-600">
            ★ THE FINE PRINT
          </div>
          <h1 className="mt-3 font-black tracking-tighter text-[40px] leading-none">
            TERMS.
          </h1>
          <div className="brand-underline" />
        </div>

        <div className="prose prose-sm max-w-none text-sm leading-relaxed space-y-3">
          <p>
            Welcome to <strong>GoTrip</strong>. By using this app you agree to:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Use it to plan real trips with real people.</li>
            <li>Not spam or abuse other users.</li>
            <li>Take responsibility for the data you upload.</li>
          </ol>
          <p className="text-gray-500 text-xs mt-6">
            This is a placeholder. Real terms coming before launch.
          </p>
        </div>
      </div>
    </main>
  )
}
