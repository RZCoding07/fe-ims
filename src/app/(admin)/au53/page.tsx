import { Metadata } from "next";
import Au53Content from "./content";

export const metadata: Metadata = {
  title: "au53 Management",
  description: "Manage your au53 data",
};

export default function Au53Page() {
  return (
        <Au53Content />
  );
}