import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { WagmiProvider, useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sdk } from '@farcaster/miniapp-sdk'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'
import { Twitter } from 'lucide-react'

import { config } from './lib/wagmi'
import { supabase } from './lib/supabase'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { Hero } from './components/Hero'
import { CreateEscrow } from './components/CreateEscrow'
import { Dashboard } from './components/Dashboard'
import { Profile } from './components/Profile'
import { Terms } from './components/Terms'
import { Privacy } from './components/Privacy'
import { Docs } from './components/Docs'
import { EscrowsProvider } from './hooks/useEscrows'
import { NetworkWarning } from './components/NetworkWarning'

const queryClient = new QueryClient()

// Deal page wrapper to extract ID from URL
function DealPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Dashboard
      onCreateClick={() => navigate('/create')}
      initialDealId={id ? Number(id) : null}
      onModalClose={() => navigate('/dashboard')}
    />
  )
}

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { address, isConnected } = useAccount()

  // Initialize Farcaster SDK & Save User Mapping
  useEffect(() => {
    const init = async () => {
      await sdk.actions.ready() // Signal readiness

      // If we have context (running as Mini App) AND wallet connected, link them
      if (isConnected && address && sdk.context?.user?.fid) {
        console.log("🔗 Linking Wallet to FID:", address, sdk.context.user.fid)
        try {
          // Correct way to access context in v4 SDK
          const context = await sdk.context

          let fid = context?.user?.fid
          let username = context?.user?.username

          // Mock data for localhost testing
          if (!fid && window.location.hostname === 'localhost') {
            console.warn("⚠️ Localhost detected: Using Mock FID")
            fid = 999999
            username = 'test-user'
          }

          if (fid) {
            console.log("✅ Resolved Context:", context)
            console.log("✅ Got FID:", fid)

            // 1. Try to delete any existing mapping for this address (to avoid conflicts if wallet switched FIDs)
            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('address', address.toLowerCase())
              .neq('fid', fid) // Don't delete self if just updating

            if (deleteError) console.warn("Cleanup warning:", deleteError)

            // 2. Upsert the new mapping
            const { error } = await supabase.from('users').upsert({
              fid: fid,
              address: address.toLowerCase(),
              username: username,
              updated_at: new Date().toISOString()
            }, { onConflict: 'fid' })

            if (error) console.error("Failed to map user:", error)
            else console.log("✅ User mapped successfully")
          } else {
            console.warn("⚠️ No user FID in context. Are you running in a frame?")
          }
        } catch (err) {
          console.error("Mapping error:", err)
        }
      }
    }

    init()
  }, [isConnected, address])

  // Get active tab from current path
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path === '/create') return 'create'
    if (path.startsWith('/dashboard') || path.startsWith('/deal')) return 'dashboard'
    if (path.startsWith('/profile')) return 'profile'
    if (path === '/terms') return 'terms'
    if (path === '/privacy') return 'privacy'
    return 'home'
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground pt-14 pb-16 md:pb-0">
      <NetworkWarning />
      <Navbar activeTab={getActiveTab()} navigate={navigate} />

      <main>
        <Routes>
          <Route path="/" element={
            <Hero
              onCreateClick={() => navigate('/create')}
              onDashboardClick={() => navigate('/dashboard')}
              onTermsClick={() => navigate('/terms')}
              onPrivacyClick={() => navigate('/privacy')}
              onDocsClick={() => navigate('/docs')}
            />
          } />
          <Route path="/create" element={
            <CreateEscrow onSuccess={() => navigate('/dashboard')} />
          } />
          <Route path="/dashboard" element={
            <Dashboard
              onCreateClick={() => navigate('/create')}
              initialDealId={null}
              onModalClose={() => { }}
            />
          } />
          <Route path="/deal/:id" element={<DealPage />} />
          <Route path="/profile/:address" element={<Profile />} />
          <Route path="/terms" element={<Terms onBack={() => navigate('/')} />} />
          <Route path="/privacy" element={<Privacy onBack={() => navigate('/')} />} />
          <Route path="/docs" element={<Docs onBack={() => navigate('/')} />} />
        </Routes>
      </main>

      <footer className="border-t py-8 sm:py-12 bg-secondary/20">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="flex justify-center gap-6">
            <a
              href="https://x.com/BasedTrust"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-all duration-200 group"
              aria-label="Follow on X (Twitter)"
            >
              <Twitter className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            </a>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-sm sm:text-base">Built with 💙 on <span className="text-primary">Base</span></p>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <a href="/docs" className="hover:text-primary transition-colors">Docs & FAQ</a>
              <span>•</span>
              <p>Secure P2P deals</p>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav activeTab={getActiveTab()} navigate={navigate} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider chain={base}>
            <EscrowsProvider>
              <AppContent />
            </EscrowsProvider>
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  )
}

export default App
