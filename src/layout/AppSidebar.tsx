/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  LayoutDashboard,
  Calendar,
  UserCircle,
  ChevronDown,
  MoreHorizontal,
  Warehouse,
  Users,
  Shield,
  Database,
  Package,
  Trash2,
  History,
  FileText,
  Boxes,
  Globe,
  Fuel,
  FlaskConical,
  Factory,
  Sprout,
  Settings,
  BookAudio,
} from "lucide-react";
import SidebarWidget from "./SidebarWidget";
import { useAuth } from "../context/AuthContext";

type SubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  requiredRole?: string | string[];
  icon?: React.ReactNode;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  requiredRole?: string | string[];
};

// Daftar semua menu utama
const mainMenuItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    name: "Dashboard",
    path: "/dashboard",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
  },

  {
    icon: <BookAudio className="w-5 h-5" />,
    name: "AU-53",
    path: "/au53",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
  },
  {
    icon: <BookAudio className="w-5 h-5" />,
    name: "Stok Barang",
    path: "/stokbarang",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
  },
  {
    icon: <FileText className="w-5 h-5" />,
    name: "AU-58",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
    subItems: [

      {
        name: "Daftar List AU-58",
        path: "/au58",
        icon: <Boxes className="w-4 h-4" />,
        requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"]
      },
      {
        name: "Approval AU-58",
        path: "/au58-approval",
        icon: <Shield className="w-4 h-4" />,
        requiredRole: ["Approval 1", "Approval 2", "Approval Final"]
      },
     
    ],
  },
  {
    icon: <Database className="w-5 h-5" />,
    name: "Master Data",
    requiredRole: ["Approval Final", "Approval 1"],
    subItems: [
      { name: "Master Material", path: "/mastermaterials", icon: <Package className="w-4 h-4" /> },
      { name: "Data Barang Bekas", path: "/databarangbekas", icon: <Trash2 className="w-4 h-4" /> },
      { name: "Data Gudang", path: "/gudang", icon: <Warehouse className="w-4 h-4" /> },
    ],
  },
  {
    icon: <Warehouse className="w-5 h-5" />,
    name: "Histori Pengeluaran",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
    subItems: [
    { name: "Pengeluaran dari Gudang Afdeling 1", path: "/stok-afd-1", icon: <Sprout className="w-4 h-4" /> },
      { name: "Pengeluaran dari Gudang Afdeling 2", path: "/stok-afd-2", icon: <Sprout className="w-4 h-4" /> },
      { name: "Pengeluaran dari Gudang Afdeling 3", path: "/stok-afd-3", icon: <Sprout className="w-4 h-4" /> },
      { name: "Pengeluaran dari Gudang Sentral", path: "/stok-sentral", icon: <Warehouse className="w-4 h-4" /> },
    ],
  },
 {
    icon: <Warehouse className="w-5 h-5" />,
    name: "Inventory",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
    subItems: [
           { name: "Stok Gudang Afdeling 1", path: "/stok-gudang-afd-1", icon: <Sprout className="w-4 h-4" /> },
      { name: "Stok Gudang Afdeling 2", path: "/stok-gudang-afd-2", icon: <Sprout className="w-4 h-4" /> },
      { name: "Stok Gudang Afdeling 3", path: "/stok-gudang-afd-3", icon: <Sprout className="w-4 h-4" /> },
      { name: "Stok Gudang Sentral", path: "/stok-gudang-sentral", icon: <Warehouse className="w-4 h-4" /> },
      { name: "Stok Gudang Kebun Tonduhan", path: "/stok-gudang-tonduhan", icon: <Warehouse className="w-4 h-4" /> },
    ],
  },
 
  {
    icon: <Shield className="w-5 h-5" />,
    name: "System",
    requiredRole: "Approval Final",
    subItems: [
      { name: "Users", path: "/system/users", icon: <Users className="w-4 h-4" /> },
      { name: "Roles", path: "/system/roles", icon: <Shield className="w-4 h-4" /> },
      { name: "Approval Flow", path: "/system/approval-flow", icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    icon: <UserCircle className="w-5 h-5" />,
    name: "Profile",
    path: "/profile",
    requiredRole: ["Maker", "Approval 1", "Approval 2", "Approval Final"],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fungsi untuk cek apakah user memiliki role yang diperlukan
  const hasRequiredRole = useCallback((requiredRole?: string | string[]) => {
    if (!requiredRole) return true;
    if (!user?.role) return false;

    const userRole = user.role;
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    return requiredRoles.includes(userRole);
  }, [user]);

  // Filter menu berdasarkan role user
  const filterMenuByRole = useCallback((items: NavItem[]): NavItem[] => {
    return items.reduce<NavItem[]>((filtered, item) => {
      if (!hasRequiredRole(item.requiredRole)) return filtered;

      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem =>
          hasRequiredRole(subItem.requiredRole)
        );

        if (filteredSubItems.length > 0) {
          filtered.push({
            ...item,
            subItems: filteredSubItems
          });
        }
      } else {
        filtered.push(item);
      }

      return filtered;
    }, []);
  }, [hasRequiredRole]);

  const filteredMainMenu = useMemo(() =>
    filterMenuByRole(mainMenuItems),
    [filterMenuByRole]
  );

  // Cek apakah path aktif
  const isActive = useCallback((path: string) => {
    if (path === '/dashboard' && pathname === '/') return true;
    if (pathname === path) return true;
    if (pathname.startsWith(path) && path !== '/') return true;
    return false;
  }, [pathname]);


  useEffect(() => {
    let foundIndex = -1;

    filteredMainMenu.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            foundIndex = index;
          }
        });
      } else if (nav.path && isActive(nav.path)) {
        foundIndex = index;
      }
    });

    // Determine the new openSubmenu state
    const newOpenSubmenu = foundIndex !== -1
      ? { type: "main" as const, index: foundIndex }
      : null;

    // Only update if the value actually changed - FIXED VERSION
    setOpenSubmenu(currentOpenSubmenu => {
      // Compare current and new state
      if (currentOpenSubmenu === null && newOpenSubmenu === null) return currentOpenSubmenu;
      if (currentOpenSubmenu?.type === newOpenSubmenu?.type &&
        currentOpenSubmenu?.index === newOpenSubmenu?.index) {
        return currentOpenSubmenu; // No change needed
      }
      return newOpenSubmenu;
    });
  }, [pathname, filteredMainMenu, isActive]); // Dependencies are correct


  // Update height submenu saat dibuka
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const timeoutId = setTimeout(() => {
        if (subMenuRefs.current[key]) {
          setSubMenuHeight((prevHeights) => ({
            ...prevHeights,
            [key]: subMenuRefs.current[key]?.scrollHeight || 0,
          }));
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [openSubmenu]);

  // Toggle submenu
  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev?.type === menuType && prev?.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // Render menu items
  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => {
    if (items.length === 0) return null;

    return (
      <ul className="flex flex-col gap-1">
        {items.map((nav, index) => {
          const isSubmenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
          const hasSubItems = nav.subItems && nav.subItems.length > 0;
          const isActiveItem = nav.path ? isActive(nav.path) : false;
          const showText = isExpanded || isHovered || isMobileOpen;

          if (hasSubItems) {
            return (
              <li key={`${menuType}-${nav.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSubmenuToggle(index, menuType)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isSubmenuOpen
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    } ${!showText ? "lg:justify-center" : "lg:justify-start"}`}
                  title={!showText ? nav.name : undefined}
                >
                  <span className={isSubmenuOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                    {nav.icon}
                  </span>
                  {showText && (
                    <>
                      <span className="ml-3 flex-1 text-left truncate">{nav.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180 text-blue-500" : "text-gray-400"
                        }`} />
                    </>
                  )}
                </button>

                {showText && (
                  <div
                    ref={(el) => {
                      subMenuRefs.current[`${menuType}-${index}`] = el;
                    }}
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      height: isSubmenuOpen ? `${subMenuHeight[`${menuType}-${index}`] || 0}px` : "0px",
                    }}
                  >
                    <ul className="mt-1 ml-9 space-y-1">
                      {nav.subItems?.map((subItem, subIndex) => (
                        <li key={`${subItem.name}-${subIndex}`}>
                          <Link
                            href={subItem.path}
                            className={`flex items-center px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive(subItem.path)
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                              }`}
                          >
                            {subItem.icon && <span className="mr-2">{subItem.icon}</span>}
                            <span className="truncate">{subItem.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          }

          if (nav.path) {
            return (
              <li key={`${menuType}-${nav.name}-${index}`}>
                <Link
                  href={nav.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${isActiveItem
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    } ${!showText ? "lg:justify-center" : "lg:justify-start"}`}
                  title={!showText ? nav.name : undefined}
                >
                  <span className={isActiveItem ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                    {nav.icon}
                  </span>
                  {showText && <span className="ml-3 truncate">{nav.name}</span>}
                </Link>
              </li>
            );
          }

          return null;
        })}
      </ul>
    );
  };

  // Render user section
  const renderUserSection = () => {
    if (!user) return null;

    const showDetails = isExpanded || isHovered || isMobileOpen;
    const initials = user.fullname
      ? user.fullname.charAt(0).toUpperCase()
      : user.username?.charAt(0).toUpperCase() || 'U';

    return (
      <div className="px-4 py-3 mt-auto border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
              {initials}
            </span>
          </div>
          {showDetails && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.fullname || user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.jabatan || user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50
        ${isExpanded || isMobileOpen ? "w-[280px]" : isHovered ? "w-[280px]" : "w-[80px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-6 px-5 border-b border-gray-200 dark:border-gray-800 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          {(isExpanded || isHovered || isMobileOpen) ? (
            <>
              <div className="flex flex-col items-center max-w-xs">
                <div className="flex items-center gap-4 ">
                  <Image
                    width={51}
                    height={48}
                    src="/images/logoIcon.svg"
                    alt="Logo"
                  />

                  <h1 className="border-l-4 dark:text-white border-sky-500 pl-3 font-semibold  sm:text-title-xs">
                    Inventory Management System
                  </h1>
                </div>

                {/* <p className="text-center dark:text-white font-semibold">
                  PT Perkebunan Nusantara IV
                </p> */}
              </div>

            </>
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} className="dark:hidden" />
          )}
        </Link>
      </div>

      {/* Menu Content */}
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
        <nav className="flex-1 p-4">
          {filteredMainMenu.length > 0 && (
            <>
              <h2 className={`mb-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 ${!isExpanded && !isHovered ? "lg:text-center" : "lg:text-left"
                }`}>
                {(isExpanded || isHovered || isMobileOpen) ? "MENU" : <MoreHorizontal className="w-5 h-5 mx-auto" />}
              </h2>
              {renderMenuItems(filteredMainMenu, "main")}
            </>
          )}
        </nav>

        {/* Sidebar Widget */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4">
            <SidebarWidget />
          </div>
        )}

        {/* User Section */}
        {renderUserSection()}
      </div>
    </aside>
  );
};

export default AppSidebar;