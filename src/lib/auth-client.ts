import type { auth } from "$lib/auth"
import { authClientPlugin } from "$lib/auth-plugin-client"
import { inferAdditionalFields } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/svelte"
export const { signIn, signUp, signOut, useSession } = createAuthClient({
    plugins: [inferAdditionalFields<typeof auth>(), authClientPlugin()]
})
