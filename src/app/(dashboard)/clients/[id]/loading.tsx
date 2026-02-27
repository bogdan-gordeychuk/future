export default function Loading() {
  return (
    <div className="max-w-3xl animate-pulse">
      {/* Back link placeholder */}
      <div className="h-4 w-24 rounded bg-zinc-100 mb-6" />

      {/* Profile card */}
      <div className="rounded-xl bg-white p-6 shadow-sm mb-6">
        <div className="h-6 w-48 rounded bg-zinc-200 mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-zinc-100" />
              <div className="h-4 w-28 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Bookings */}
      <div className="mb-6">
        <div className="h-5 w-20 rounded bg-zinc-200 mb-3" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-zinc-200" />
                <div className="h-3 w-24 rounded bg-zinc-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat history */}
      <div>
        <div className="h-5 w-28 rounded bg-zinc-200 mb-3" />
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-10 rounded-2xl bg-zinc-100 ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
