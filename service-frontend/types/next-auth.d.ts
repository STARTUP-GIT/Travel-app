import type { DefaultSession } from "next-auth";
import type { ProviderKind } from "@/features/provider/types";

/**
 * The service app authenticates against four different backend routers, so the
 * session has to carry two things the default `Session` does not have:
 *
 *  - `backendToken`: the JWT the Express backend issues. It is the only thing
 *    the backend middleware accepts, and it is kept here so authenticated
 *    server actions can send it as a Bearer token.
 *  - `providerKind`: which of the four routers issued the token, so the session
 *    can be validated against the right one and screens know what to render.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /**
       * The account's real `username`, read from the backend profile when the
       * session is created. `name` cannot be used for this: for an email
       * sign-in it holds the part of the address before the `@`.
       */
      username?: string;
    } & DefaultSession["user"];
    backendToken?: string;
    providerKind?: ProviderKind;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    providerKind?: ProviderKind;
    username?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    backendToken?: string;
    providerKind?: ProviderKind;
    username?: string;
  }
}

export {};
