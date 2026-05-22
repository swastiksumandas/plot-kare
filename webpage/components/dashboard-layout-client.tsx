'use client'

import { usePathname } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'

const navItems = [
  { href: '/dashboard', label: 'My Plots' },
  { href: '/dashboard/reports', label: 'Inspection Reports' },
  { href: '/dashboard/amenities', label: 'Amenities' },
  { href: '/dashboard/listings', label: 'Property Listings' },
  { href: '/dashboard/documents', label: 'Document Vault' },
  { href: '/dashboard/value-tracker', label: 'Value Tracker' },
  { href: '/dashboard/legal-status', label: 'Legal Status' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const item = navItems.find((n) => pathname === n.href) || 
               navItems.find((n) => n.href !== '/dashboard' && pathname.startsWith(n.href))
               
  const title = item ? item.label : 'PlotKare'

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title={title} />
        <div className="px-8 pb-12 pt-24">
          {children}
        </div>
      </div>
    </div>
  )
}
