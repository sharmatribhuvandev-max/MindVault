import { useEffect, useState } from "react";

import { GitHubIcon } from "../icons/GitHubIcon";
import { GoogleIcon } from "../icons/GoogleIcon";
import {
    fetchEnabledProviders,
    oauthStartUrl,
    type EnabledProviders,
} from "../oauth";
import { GuestButton } from "./GuestButton";

const providerButtonClass =
    "flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-[var(--mindvault-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--mindvault-ink)] transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mindvault-focus)]";

// Everything below the username/password form: social sign-in (when
// configured) and the guest demo.
export function AlternativeSignIn() {
    const [providers, setProviders] = useState<EnabledProviders | null>(null);

    useEffect(() => {
        let ignore = false;

        void fetchEnabledProviders().then((result) => {
            if (!ignore) {
                setProviders(result);
            }
        });

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <div className="mt-5">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--mindvault-muted)]">
                <span className="h-px flex-1 bg-[var(--mindvault-border)]" />
                or
                <span className="h-px flex-1 bg-[var(--mindvault-border)]" />
            </div>

            <div className="mt-5 space-y-3">
                {providers?.google && (
                    <a href={oauthStartUrl("google")} className={providerButtonClass}>
                        <GoogleIcon />
                        Continue with Google
                    </a>
                )}

                {providers?.github && (
                    <a href={oauthStartUrl("github")} className={`${providerButtonClass} [&_svg]:h-5 [&_svg]:w-5`}>
                        <GitHubIcon />
                        Continue with GitHub
                    </a>
                )}

                <GuestButton />
            </div>
        </div>
    );
}
