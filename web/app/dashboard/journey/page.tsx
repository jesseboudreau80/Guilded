// Legacy route — redirects to the canonical Command Center URL.
// Preserves any bookmarks or external links to /dashboard/journey.
import { redirect } from "next/navigation";

export default function JourneyRedirect() {
  redirect("/dashboard/command-center");
}
