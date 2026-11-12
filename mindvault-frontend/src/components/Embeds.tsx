import { useEffect, useState, type ReactNode } from "react";

import { GitHubIcon } from "../icons/GitHubIcon";
import { InstagramIcon } from "../icons/InstagramIcon";
import { LinkedInIcon } from "../icons/LinkedInIcon";
import {
    parseGitHubUrl,
    parseInstagramUrl,
    parseLinkedInUrl,
} from "../embedUrls";
import { getDisplayDomain } from "../contentTypes";
import { fetchRepo, type RepoInfo } from "../githubRepo";

// A compact, clickable card for links that can't (or shouldn't) be
// embedded. Used by articles and as the fallback for every embed type.
export function LinkCard({
    href,
    icon,
    primary,
    secondary,
    children,
}: {
    href: string;
    icon: ReactNode;
    primary: string;
    secondary: string;
    children?: ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:p-4"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-700 [&_svg]:h-5 [&_svg]:w-5" aria-hidden="true">
                {icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">
                    {primary}
                </span>
                {children}
                <span className="block text-sm text-indigo-700">
                    {secondary}
                </span>
            </span>
        </a>
    );
}

function OpenOriginal({ href, site }: { href: string; site: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-slate-500 underline-offset-2 hover:underline"
        >
            Not loading? Open on {site}
        </a>
    );
}

// ---------------------------------------------------------------- GitHub

function formatStars(stars: number): string {
    return stars >= 1000
        ? `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k`
        : String(stars);
}

function GitHubRepoCard({
    link,
    owner,
    repo,
}: {
    link: string;
    owner: string;
    repo: string;
}) {
    const [info, setInfo] = useState<RepoInfo | null>(null);

    useEffect(() => {
        let ignore = false;

        void fetchRepo(owner, repo).then((result) => {
            if (!ignore) {
                setInfo(result);
            }
        });

        return () => {
            ignore = true;
        };
    }, [owner, repo]);

    return (
        <LinkCard
            href={link}
            icon={<GitHubIcon />}
            primary={info?.fullName ?? `${owner}/${repo}`}
            secondary="View repository →"
        >
            {info?.description && (
                <span className="mt-1 line-clamp-2 block text-sm text-slate-600">
                    {info.description}
                </span>
            )}

            {info && (
                <span className="my-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span aria-label={`${info.stars} stars`}>
                        ★ {formatStars(info.stars)}
                    </span>
                    {info.language && <span>{info.language}</span>}
                </span>
            )}
        </LinkCard>
    );
}

export function GitHubEmbed({ link }: { link: string }) {
    const target = parseGitHubUrl(link);

    if (target?.kind === "repo") {
        return (
            <GitHubRepoCard
                link={link}
                owner={target.owner}
                repo={target.repo}
            />
        );
    }

    if (target?.kind === "user") {
        return (
            <LinkCard
                href={link}
                icon={
                    <img
                        src={`https://github.com/${encodeURIComponent(target.owner)}.png?size=80`}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10"
                    />
                }
                primary={target.owner}
                secondary="View GitHub profile →"
            />
        );
    }

    return (
        <LinkCard
            href={link}
            icon={<GitHubIcon />}
            primary={getDisplayDomain(link) ?? link}
            secondary="Open on GitHub →"
        />
    );
}

// ------------------------------------------------------------- Instagram

export function InstagramEmbed({ link, title }: { link: string; title: string }) {
    const target = parseInstagramUrl(link);

    if (target?.kind !== "post") {
        return (
            <LinkCard
                href={link}
                icon={<InstagramIcon />}
                primary="Instagram"
                secondary="Open on Instagram →"
            />
        );
    }

    return (
        <div>
            <iframe
                src={target.embedUrl}
                title={title}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="h-[560px] w-full rounded-lg border border-slate-200 bg-white"
            />
            <OpenOriginal href={link} site="Instagram" />
        </div>
    );
}

// -------------------------------------------------------------- LinkedIn

const LINKEDIN_LABELS = {
    profile: "LinkedIn profile",
    company: "LinkedIn company page",
    other: "LinkedIn",
} as const;

export function LinkedInEmbed({ link, title }: { link: string; title: string }) {
    const target = parseLinkedInUrl(link);

    if (target?.kind !== "post") {
        return (
            <LinkCard
                href={link}
                icon={<LinkedInIcon />}
                primary={LINKEDIN_LABELS[target?.kind ?? "other"]}
                secondary="Open on LinkedIn →"
            />
        );
    }

    return (
        <div>
            <iframe
                src={target.embedUrl}
                title={title}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="h-[520px] w-full rounded-lg border border-slate-200 bg-white"
            />
            <OpenOriginal href={link} site="LinkedIn" />
        </div>
    );
}
