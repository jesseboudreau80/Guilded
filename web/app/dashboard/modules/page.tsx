import { redirect } from "next/navigation";

/**
 * Legacy LMS route — superseded by Guild Academy.
 * Redirect any existing links or bookmarks to the new curriculum path.
 */
export default function ModulesPage() {
  redirect("/dashboard/academy");
}
