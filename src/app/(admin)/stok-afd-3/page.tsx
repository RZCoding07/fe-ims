import { Metadata } from "next";
import Au58Content from "./content";

export const metadata: Metadata = {
  title: "stok afdeling 3 Management",
  description: "Manage your stok barang data",
};

export default function StokbarangPage() {
  return (
        <Au58Content />
  );
}