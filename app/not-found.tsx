import { NotFoundScreen } from "@/components/not-found-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Border Time",
};

export default function NotFound() {
  return <NotFoundScreen />;
}
