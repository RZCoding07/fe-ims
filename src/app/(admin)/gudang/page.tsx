import { Metadata } from "next";
import GudangContent from "./content";

export const metadata: Metadata = {
  title: "gudang Management",
  description: "Manage your gudang data",
};

export default function GudangPage() {
  return (
        <GudangContent />
  );
}