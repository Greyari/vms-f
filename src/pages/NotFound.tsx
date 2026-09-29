import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

/** Any path no route matches, inside the signed-in layout (decision FE-3). */
export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-zinc-500">
        Alamat yang dibuka tidak ada di VMS. Periksa kembali alamatnya atau
        kembali ke dashboard.
      </p>
      <Button asChild>
        <Link to="/">Kembali ke dashboard</Link>
      </Button>
    </div>
  )
}
