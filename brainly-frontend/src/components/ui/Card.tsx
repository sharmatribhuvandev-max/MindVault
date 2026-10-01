import { ShareIcon } from "../../icons/ShareIcon";


export function Card(){
    return <div>
        <div className="p-4 bg-white rounded-md border-gray-200 max-w-72 border">
        <div className="flex justify-between">
            <div className="flex items-center text-md">
                <div className="text-gray-500 pr-2">
                 <ShareIcon/>   
                </div>
                
                Project Ideas
            </div>
            <div className="flex items-center">
                <div className="pr-2 text-gray-500">
                 <ShareIcon/>   
                </div>
                <div className="text-gray-500">
                 <ShareIcon/>   
                </div>    
            </div>
        </div>
        
        <div className="pt-4">
        <iframe className="w-full" src="https://www.youtube.com/embed/cmSh2xbyX7g?si=JC3tLUZ4qW-qvIQm" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
        
        {/* <blockquote class="twitter-tweet">
<p lang="en" dir="ltr">
Training hard and staying focused 💪⚽
pic.twitter.com/abc123xyz
</p>&mdash; Cristiano Ronaldo (@Cristiano)
<a href="https://twitter.com/Cristiano/status/1706721234567890123">
September 26, 2023
</a>
</blockquote>

<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> */}
        </div>
        
    </div>
        </div>
}