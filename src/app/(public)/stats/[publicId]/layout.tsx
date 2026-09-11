import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>
}): Promise<Metadata> {
  await params

  return {
    title: 'Afficixo Stats',
    appleWebApp: false,
    manifest: null,
  }
}

export default function PublicStatsLayout({ children }: { children: React.ReactNode }) {
  return children
}