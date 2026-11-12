import type { ReactNode } from "react";
import { Layers, Search, Share2 } from "lucide-react";

import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const FEATURES = [
    {
        Icon: Layers,
        title: "Save anything",
        text: "Videos, posts, articles, repos and your own notes, in one place.",
    },
    {
        Icon: Search,
        title: "Find it again",
        text: "Search, pin, favorite and group things into collections.",
    },
    {
        Icon: Share2,
        title: "Share your Brain",
        text: "Publish a read-only page. Private notes stay private.",
    },
];

interface AuthLayoutProps {
    titleId: string;
    title: string;
    subtitle: string;
    children: ReactNode;
}

// Shared frame for sign-in, sign-up and the guest/OAuth hand-off pages:
// a quiet brand panel on wide screens and the form on the right.
export function AuthLayout({ titleId, title, subtitle, children }: AuthLayoutProps) {
    return (
        <main className="grid min-h-screen w-full bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
                <div
                    className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_left,black_10%,transparent_70%)]"
                    aria-hidden="true"
                />

                <Logo className="relative" />

                <div className="relative max-w-md">
                    <p className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                        A calm home for everything worth remembering.
                    </p>

                    <ul className="mt-8 space-y-5">
                        {FEATURES.map(({ Icon, title: featureTitle, text }) => (
                            <li key={featureTitle} className="flex gap-3.5">
                                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-accent-text shadow-soft">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span>
                                    <span className="block text-sm font-medium text-ink">{featureTitle}</span>
                                    <span className="block text-sm text-muted">{text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-faint">Mind Vault</p>
            </aside>

            <section aria-labelledby={titleId} className="flex min-h-screen flex-col">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                    <Logo className="lg:invisible" />
                    <ThemeToggle />
                </div>

                <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-6">
                    <div className="w-full max-w-sm">
                        <div className="mb-7">
                            <h1
                                id={titleId}
                                className="text-2xl font-semibold tracking-[-0.025em] text-ink"
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
                            )}
                        </div>

                        {children}
                    </div>
                </div>
            </section>
        </main>
    );
}
