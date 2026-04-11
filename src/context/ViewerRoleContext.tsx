"use client";

import { createContext, useContext, ReactNode } from "react";

type ViewerRoleContextValue = {
  role: string | null;
  isArtist: boolean;
  isListener: boolean;
  isAdmin: boolean;
  isLoaded: boolean;
};

const ViewerRoleContext = createContext<ViewerRoleContextValue | undefined>(undefined);

export function ViewerRoleProvider({
  children,
  initialRole = null,
}: {
  children: ReactNode;
  initialRole?: string | null;
}) {
  const role = initialRole;
  const isLoaded = true;

  return (
    <ViewerRoleContext.Provider
      value={{
        role,
        isArtist: role === "artist",
        isListener: role === "listener",
        isAdmin: role === "admin",
        isLoaded,
      }}
    >
      {children}
    </ViewerRoleContext.Provider>
  );
}

export function useViewerRole() {
  const context = useContext(ViewerRoleContext);

  if (!context) {
    throw new Error("useViewerRole must be used within ViewerRoleProvider");
  }

  return context;
}
