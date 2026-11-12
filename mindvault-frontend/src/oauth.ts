import axios from "axios";

import { BACKEND_URL } from "./config";

export type OAuthProvider = "google" | "github";

export type EnabledProviders = Record<OAuthProvider, boolean>;

// Which "Continue with ..." buttons to show. Providers only appear once
// their client ID and secret are configured on the backend.
export async function fetchEnabledProviders(): Promise<EnabledProviders> {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/auth/providers`);

        return {
            google: response.data?.google === true,
            github: response.data?.github === true,
        };
    } catch {
        return { google: false, github: false };
    }
}

export function oauthStartUrl(provider: OAuthProvider): string {
    return `${BACKEND_URL}/api/v1/auth/${provider}/start`;
}

const OAUTH_ERRORS: Record<string, string> = {
    oauth_cancelled: "Sign-in was cancelled.",
    oauth_failed: "Couldn't sign you in with that account. Please try again.",
};

export function oauthErrorMessage(code: string | null): string {
    return code ? OAUTH_ERRORS[code] ?? "" : "";
}
