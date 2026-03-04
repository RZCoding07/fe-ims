import { Metadata } from "next";
import StokbarangContent from "./content";

export const metadata: Metadata = {
  title: "stok barang Management",
  description: "Manage your stok barang data",
};

export default function StokbarangPage() {
  return (
        <StokbarangContent />
  );
}