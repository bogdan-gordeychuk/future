export default function KnowledgeLoading() {
  return (
    <div>
      <div className="h-8 w-48 rounded-lg bg-zinc-100 animate-pulse mb-1" />
      <div className="h-4 w-72 rounded bg-zinc-100 animate-pulse mb-8" />
      <div className="space-y-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
