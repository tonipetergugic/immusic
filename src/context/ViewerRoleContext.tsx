"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ViewerRoleContextValue = {
  role: string | null;
  isArtist: boolean;
  isListener: boolean;
  isAdmin: boolean;
  isLoaded: boolean;
};

const ViewerRoleContext = createContext<ViewerRoleContextValue | undefined>(undefined);

export function ViewerRoleProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [role, setRole] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user?.id) {
        setRole(null);
        setIsLoaded(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        console.error("viewer role load error:", profileError);
        setRole(null);
        setIsLoaded(true);
        return;
      }

      setRole(profile?.role ?? null);
      setIsLoaded(true);
    }

    function handleRoleUpdate(event: Event) {
      const customEvent = event as CustomEvent<string | null>;
      const nextRole = customEvent.detail;

      if (typeof nextRole === "string" || nextRole === null) {
        setRole(nextRole ?? null);
        setIsLoaded(true);
      }
    }

    void loadRole();
    window.addEventListener("roleUpdated", handleRoleUpdate as EventListener);

    return () => {
      active = false;
      window.removeEventListener("roleUpdated", handleRoleUpdate as EventListener);
    };
  }, [supabase]);

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
