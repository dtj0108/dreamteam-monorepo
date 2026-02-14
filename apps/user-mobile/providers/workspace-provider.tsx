import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth-provider";

const WORKSPACE_ID_KEY = "currentWorkspaceId";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  avatar_url?: string;
  description?: string;
}

interface WorkspaceMembership {
  role: string;
  workspace: Workspace;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      await AsyncStorage.removeItem(WORKSPACE_ID_KEY);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get user's workspace memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from("workspace_members")
        .select(
          `
          role,
          workspace:workspaces(id, name, slug, owner_id, avatar_url, description)
        `
        )
        .eq("profile_id", user.id);

      if (membershipsError) {
        console.error("Error fetching workspaces:", membershipsError);
        setIsLoading(false);
        return;
      }

      // Extract workspaces from memberships
      const userWorkspaces = (memberships as unknown as WorkspaceMembership[])
        .map((m) => m.workspace)
        .filter(Boolean);

      setWorkspaces(userWorkspaces);

      // Get user's default workspace
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .single();

      // Set current workspace (default or first available)
      let selectedWorkspace: Workspace | null = null;
      if (profile?.default_workspace_id) {
        const defaultWs = userWorkspaces.find(
          (ws) => ws.id === profile.default_workspace_id
        );
        selectedWorkspace = defaultWs || userWorkspaces[0] || null;
      } else if (userWorkspaces.length > 0) {
        selectedWorkspace = userWorkspaces[0];
      }

      // Store workspace ID for API client access
      if (selectedWorkspace) {
        await AsyncStorage.setItem(WORKSPACE_ID_KEY, selectedWorkspace.id);
      } else {
        await AsyncStorage.removeItem(WORKSPACE_ID_KEY);
      }

      // Update state after storage to avoid stale workspaceId reads in API client
      setCurrentWorkspace(selectedWorkspace);
    } catch (error) {
      console.error("Error in fetchWorkspaces:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      const workspace = workspaces.find((ws) => ws.id === workspaceId);
      if (workspace) {
        // Store workspace ID for API client access
        await AsyncStorage.setItem(WORKSPACE_ID_KEY, workspace.id);

        setCurrentWorkspace(workspace);

        // Optionally update default workspace in profile
        if (user) {
          void (async () => {
            try {
              const { error } = await supabase
                .from("profiles")
                .update({ default_workspace_id: workspaceId })
                .eq("id", user.id);

              if (error) {
                console.error("Error updating default workspace:", error);
              }
            } catch (error) {
              console.error("Error updating default workspace:", error);
            }
          })();
        }
      }
    },
    [workspaces, user]
  );

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    isLoading,
    switchWorkspace,
    refreshWorkspaces: fetchWorkspaces,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
