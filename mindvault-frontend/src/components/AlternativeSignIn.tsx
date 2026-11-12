import { useEffect, useState } from "react";

import { GitHubIcon } from "../icons/GitHubIcon";
import { GoogleIcon } from "../icons/GoogleIcon";
import {
    fetchEnabledProviders,
    oauthStartUrl,
    type EnabledProviders,
} from "../oauth";
import { GuestButton } from "./GuestButton";
import { authSecondaryButton } from "../authStyles";

const providerButtonClass = authSecondaryButton;

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
            <div className="flex items-center gap-3 text-xs text-faint">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
            </div>

            <div className="mt-5 space-y-2.5">
                {providers?.google && (
                    <a href={oauthStartUrl("google")} className={providerButtonClass}>
                        <GoogleIcon />
                        Continue with Google
                    </a>
                )}

                {providers?.github && (
                    <a href={oauthStartUrl("github")} className={`${providerButtonClass} [&_svg]:h-[18px] [&_svg]:w-[18px]`}>
                        <GitHubIcon />
                        Continue with GitHub
                    </a>
                )}

                <GuestButton />
            </div>
        </div>
    );
}
