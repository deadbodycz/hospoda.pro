import { SessionProvider } from '@/contexts/SessionContext'

export default function PubLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { pubId: string }
}) {
  return (
    <SessionProvider pubId={params.pubId}>
      {children}
    </SessionProvider>
  )
}
