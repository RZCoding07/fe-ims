import { Metadata } from "next";
import MastermaterialsContent from "./content";

export const metadata: Metadata = {
  title: "master materials Management",
  description: "Manage your master materials data",
};

export default function MastermaterialsPage() {
  return (
        <MastermaterialsContent />
  );
}