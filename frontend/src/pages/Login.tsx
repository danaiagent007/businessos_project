import { SignIn } from '@clerk/clerk-react'

export function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8f9fb' }}>
      <SignIn routing="hash" afterSignInUrl="/overview" />
    </div>
  )
}
