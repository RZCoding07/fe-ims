import { Metadata } from "next";
import Au58Content from "./content";

export const metadata: Metadata = {
  title: "au58 Management",
  description: "Manage your au58 data",
};

export default function Au58Page() {
  return (
        <Au58Content />
  );
}