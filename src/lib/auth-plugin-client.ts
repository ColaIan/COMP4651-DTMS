import type { BetterAuthClientPlugin } from "better-auth";
import type { authPlugin } from "./auth-plugin";
type AuthPlugin = typeof authPlugin;
export const authClientPlugin = () => {
  return {
    id: "authPlugin",
    $InferServerPlugin: {} as ReturnType<AuthPlugin>,
  } satisfies BetterAuthClientPlugin;
};