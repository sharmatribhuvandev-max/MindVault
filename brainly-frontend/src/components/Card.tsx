import { ShareIcon } from "../icons/ShareIcon"

interface CardProps {
    title: string;
    link: string;
    type: "twitter" | "youtube";
}

export function Card({ title, link, type }: CardProps) {
    return <div>
        <div className="p-4 bg-white rounded-md border-gray-200 max-w-72 border min-h-48 min-w-72">
            <div className="flex justify-between">
                <div className="flex items-center text-md">
                    <div className="text-gray-500 pr-2">
                        <ShareIcon />
                    </div>
                    {title}
                </div>
                <div className="flex items-center">
                    <div className="pr-2 text-gray-500">
                        <a href={link} target="_blank">
                            <ShareIcon />
                        </a>

                    </div>
                    <div className="text-gray-500">
                        <ShareIcon />
                    </div>
                </div>
            </div>

            <div className="pt-4">
                {type === "youtube" && <iframe className="w-full" src={link.replace("watch", "embed").replace("?v=", "/")} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>}

                {type === "twitter" && <><blockquote className="twitter-tweet"><p lang="en" dir="ltr">the last thing my bangers see before being posted <a href="https://t.co/dD6XhDKa7J">pic.twitter.com/dD6XhDKa7J</a></p>&mdash; X (@X) <a href={link}></a></blockquote> <script async src="https://platform.x.com/widgets.js" charSet="utf-8"></script></>}
                {/* <blockquote className="twitter-tweet"><p lang="en" dir="ltr">the last thing my bangers see before being posted <a href="https://t.co/dD6XhDKa7J">pic.twitter.com/dD6XhDKa7J</a></p>&mdash; X (@X) <a href="https://x.com/X/status/2043383260927918213?ref_src=twsrc%5Etfw">April 12, 2026</a></blockquote> <script async src="https://platform.x.com/widgets.js" charSet="utf-8"></script> */}
            </div>

        </div>
    </div>
}