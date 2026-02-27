export default function Loading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-7 w-36 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-64 rounded bg-zinc-100" />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
        <div className="h-5 w-48 rounded bg-zinc-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-24 rounded bg-zinc-100" />
            <div className="h-9 rounded-lg bg-zinc-100" />
          </div>
        ))}
        <div className="h-9 w-24 rounded-lg bg-zinc-200" />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
        <div className="h-5 w-32 rounded bg-zinc-200" />
        <div className="space-y-1">
          <div className="h-3 w-20 rounded bg-zinc-100" />
          <div className="h-9 rounded-lg bg-zinc-100" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-zinc-200" />
      </div>
    </div>
  )
}
