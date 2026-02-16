import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";
import { Metadata } from "next";
import RolesPage from "./content";

export const metadata: Metadata = {
  title: "Data Roles",
  description: "",
};

export default function BlankPage() {
  return (
    <RolesPage/>
  );
}
