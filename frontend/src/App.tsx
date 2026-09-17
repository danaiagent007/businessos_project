import { Routes, Route, Navigate } from 'react-router'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Overview }       from '@/pages/dashboard/Overview'
import { LeadsPage }      from '@/pages/dashboard/Leads'
import { CustomersPage }  from '@/pages/dashboard/Customers'
import { PipelinePage }   from '@/pages/dashboard/Pipeline'
import { AnalyticsPage }  from '@/pages/dashboard/Analytics'
import { FollowupsPage }  from '@/pages/dashboard/Followups'
import { KnowledgePage }  from '@/pages/dashboard/Knowledge'
import {
  InboxPage,
  DocumentsPage,
  AutomationsPage,
  IntegrationsPage,
  SettingsPage,
} from '@/pages/dashboard/Inbox'
import { LoginPage } from '@/pages/Login'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected dashboard */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <DashboardLayout />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview"     element={<Overview />} />
        <Route path="leads"        element={<LeadsPage />} />
        <Route path="customers"    element={<CustomersPage />} />
        <Route path="pipeline"     element={<PipelinePage />} />
        <Route path="followups"    element={<FollowupsPage />} />
        <Route path="inbox"        element={<InboxPage />} />
        <Route path="documents"    element={<DocumentsPage />} />
        <Route path="automations"  element={<AutomationsPage />} />
        <Route path="analytics"    element={<AnalyticsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings"     element={<SettingsPage />} />
        <Route path="knowledge"    element={<KnowledgePage />} />
      </Route>
    </Routes>
  )
}
