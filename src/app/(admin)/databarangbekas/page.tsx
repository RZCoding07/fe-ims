import { Metadata } from "next";
import DatabarangbekasContent from "./content";

export const metadata: Metadata = {
  title: "data barang bekas Management",
  description: "Manage your data barang bekas data",
};

export default function DatabarangbekasPage() {
  return (
        <DatabarangbekasContent />
  );
}