import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0"


        >
          {children}
          <div className="lg:w-3/5  border-l-4 border-sky-400  w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden"
            style={{
              backgroundImage: `
      linear-gradient(
        to bottom right,
        rgba(4, 38, 131, 0.7),
        rgba(2, 22, 31, 0.66),
        rgba(0,0,0,0)
      ),
      url('https://www.infosawit.com/wp-content/uploads/2023/10/Lanskap-Sawit_Domi-Yanto-WP.jpg')
    `,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="flex items-center gap-4 mb-4">
                  <Image
                    width={151}
                    height={48}
                    src="/images/logoIcon.svg"
                    alt="Logo"
                  />

                  <h1 className="border-l-4 border-sky-500 pl-3 font-semibold text-white sm:text-title-md">
                    Inventory Management System
                  </h1>
                </Link>

                <p className="text-center text-white font-semibold">
                  PT Perkebunan Nusantara IV
                </p>
              </div>

            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block"


          >
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
