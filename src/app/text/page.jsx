import { redirect } from "next/navigation";

// The homepage is text-first now; keep old /text links working.
export default function TextPage() {
  redirect("/");
}
