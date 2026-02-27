export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="h-7 w-44 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-52 rounded bg-zinc-100" />
      </div>
      <div className="h-9 w-40 rounded-lg bg-zinc-200" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-100" />
          </div>
          <div className="h-7 w-16 rounded-lg bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
