"use client";

import { createContext, useContext } from "react";

type AdminPanelContextValue = { restaurantName: string; userRole: string };
const AdminPanelContext = createContext<AdminPanelContextValue>({ restaurantName: "Your Restaurant", userRole: "OWNER" });

export function AdminPanelContextProvider({
  value,
  children,
}: {
  value: AdminPanelContextValue;
  children: React.ReactNode;
}) {
  return <AdminPanelContext.Provider value={value}>{children}</AdminPanelContext.Provider>;
}

export function useAdminPanelContext() {
  return useContext(AdminPanelContext);
}
