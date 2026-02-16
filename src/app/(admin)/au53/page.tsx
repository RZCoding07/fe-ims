import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";
import { Metadata } from "next";
import Au53Page from "./content";

export const metadata: Metadata = {
  title: "Data AU53",
description: "",
};

export default function BlankPage() {
  return (
    <Au53Page/>
  );
}
