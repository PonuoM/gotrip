import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-white p-6">
      <div className="max-w-md mx-auto">
        <Link href="/login" className="text-xs font-bold tracking-[2px] text-gray-500 no-underline">
          ← BACK
        </Link>

        <div className="mt-6 mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[3px] text-gray-600">
            ★ YOUR DATA
          </div>
          <h1 className="mt-3 font-black tracking-tighter text-[40px] leading-none">
            PRIVACY.
          </h1>
          <div className="brand-underline" />
        </div>

        <div className="prose prose-sm max-w-none text-sm leading-relaxed space-y-3">
          <p>
            We collect only what we need to make GoTrip work:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Email & name</strong> — from your Google / LINE login.</li>
            <li><strong>Trip data</strong> — what you create in the app.</li>
            <li>
              <strong>We never sell your data.</strong> It stays in your Supabase database
              and is shared only with people you invite to a trip.
            </li>
          </ul>
          <p className="text-gray-500 text-xs mt-6">
            This is a placeholder. Real privacy policy coming before launch.
          </p>
        </div>
      </div>
    </main>
  )
}
