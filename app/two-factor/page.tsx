import { TwoFactorVerify } from "@/components/two-factor-verify"

export default function TwoFactorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-lime-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <TwoFactorVerify />
      </div>
    </div>
  )
}
