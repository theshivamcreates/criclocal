import Link from "next/link";
import { isFirebaseConfigured } from "@/lib/firebase";

export function FirebaseNotice() {
  if (isFirebaseConfigured) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Firebase is not connected yet. Add your `NEXT_PUBLIC_FIREBASE_*` values in `.env.local` to enable live sync.
      <Link className="ml-2 font-semibold underline" href="/dashboard">
        Open dashboard
      </Link>
    </div>
  );
}
