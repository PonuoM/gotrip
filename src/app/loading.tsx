export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-white pb-28">
      <div className="max-w-md mx-auto p-6 animate-pulse">

        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="mt-3 h-12 w-40 bg-gray-300 rounded" />
          <div className="mt-2 h-1 w-14 bg-brand-red rounded" />
        </div>

        {/* Hero card skeleton */}
        <div className="card-base bg-gray-100 h-28 border-gray-300" />

        {/* List skeleton */}
        <div className="mt-8 space-y-2">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          {[0, 1, 2].map(i => (
            <div key={i} className="card-base bg-gray-50 h-16 border-gray-200" />
          ))}
        </div>
      </div>

      {/* Fixed bottom nav placeholder */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-black h-12" />
    </main>
  )
}
