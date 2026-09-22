import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved · Karnataka Tourism Guide",
  description: "Places and guides you saved for later.",
};

import SavedScreen from "./saved-screen";

export default function FavoritesPage() {
  return <SavedScreen />;
}