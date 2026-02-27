export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div>
        <div className="h-7 w-36 rounded bg-zinc-200 mb-1" />
        <div className="h-4 w-60 rounded bg-zinc-100" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-zinc-200" />
            <div className="h-3 w-56 rounded bg-zinc-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}
