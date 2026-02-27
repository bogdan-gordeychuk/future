export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="h-7 w-40 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-56 rounded bg-zinc-100" />
      </div>
      <div className="h-9 w-36 rounded-lg bg-zinc-200" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-200" />
            <div className="h-3 w-48 rounded bg-zinc-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded-lg bg-zinc-100" />
            <div className="h-7 w-16 rounded-lg bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
