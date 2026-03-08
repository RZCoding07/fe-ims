import { Metadata } from "next";
import Au58Component from "./au58component";
export const metadata: Metadata = {
  title: "stok afdeling 2 Management",
  description: "Manage your stok barang data",
};

export default function StokbarangPage() {
  return (
        <Au58Component />
  );
}