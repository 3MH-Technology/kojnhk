import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="grid h-screen w-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  )
}
