
import PublicProfileRedirect from "../../../../src/components/profile/PublicProfileRedirect"

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params
    return (
        <div className="min-h-screen bg-[#F2F2F2] dark:bg-black font-sans">
            <div className="h-48 bg-gradient-to-b from-zinc-200 to-[#F2F2F2] dark:from-zinc-900 dark:to-black" />
            <div className="max-w-7xl mx-auto px-6 -mt-24">
                <PublicProfileRedirect username={username} />
            </div>
        </div>
    )
}