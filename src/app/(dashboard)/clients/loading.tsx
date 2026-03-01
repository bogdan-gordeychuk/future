export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="h-7 w-28 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-40 rounded bg-zinc-100" />
      </div>
      <div className="h-9 w-72 rounded-lg bg-zinc-100" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-zinc-200" />
            <div className="h-3 w-24 rounded bg-zinc-100" />
          </div>
          <div className="flex gap-6">
            <div className="space-y-1 text-right">
              <div className="h-3 w-20 rounded bg-zinc-100" />
              <div className="h-4 w-16 rounded bg-zinc-200" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-3 w-16 rounded bg-zinc-100" />
              <div className="h-4 w-8 rounded bg-zinc-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
