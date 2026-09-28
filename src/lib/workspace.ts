import { createContext, useContext } from "react";
import type { Role } from "@/lib/types";

export interface WorkspaceValue {
  role: Role;
  base: "/admin" | "/employee";
}

export const WorkspaceContext = createContext<WorkspaceValue>({ role: "admin", base: "/admin" });

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
