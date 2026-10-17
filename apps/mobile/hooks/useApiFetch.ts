import { useAuth } from "@clerk/expo";
import { format } from "date-fns";
import { useCallback } from "react";

export type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * fetch() for the BePlan backend: attaches the signed-in user's Clerk session
 * token as `Authorization: Bearer <token>`. The backend derives the user from
 * this token, so requests without it are rejected with 401.
 *
 * It also sends the device's local calendar date as `X-Local-Date`; the
 * backend uses it to decide which tasks are overdue in the user's timezone.
 */
export function useApiFetch(): ApiFetch {
  const { getToken } = useAuth();

  return useCallback(
    async (input: string, init: RequestInit = {}) => {
      // Since Clerk Core 3, getToken() throws when offline (it used to return
      // null). Send the request without a token; the fetch itself then fails
      // (offline) or the backend answers 401, both handled by the caller.
      let token: string | null = null;
      try {
        token = await getToken();
      } catch (error) {
        console.warn("Couldn't get a session token:", error);
      }
      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("X-Local-Date", format(new Date(), "yyyy-MM-dd"));
      return fetch(input, { ...init, headers });
    },
    [getToken]
  );
}
