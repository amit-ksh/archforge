import { ArchitectureWorkspace } from "@/features/workspace";

import { ArchitectureProvider } from "./architecture-provider";

export default function Home() {
  return (
    <ArchitectureProvider>
      <ArchitectureWorkspace />
    </ArchitectureProvider>
  );
}
