import { useAuth } from "@clerk/clerk-expo";
import { useCallback } from "react";

export type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * fetch() for the BePlan backend: attaches the signed-in user's Clerk session
 * token as `Authorization: Bearer <token>`. The backend derives the user from
 * this token, so requests without it are rejected with 401.
 */
export function useApiFetch(): ApiFetch {
  const { getToken } = useAuth();

  return useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [getToken]
  );
}
