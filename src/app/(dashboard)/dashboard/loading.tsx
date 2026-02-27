export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-48 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-64 rounded bg-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="h-3 w-20 rounded bg-zinc-100 mb-3" />
            <div className="h-8 w-12 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="h-40 rounded-xl bg-white shadow-sm" />
    </div>
  )
}
