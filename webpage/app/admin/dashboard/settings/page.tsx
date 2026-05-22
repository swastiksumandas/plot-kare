import { SettingsPageContent } from '@/components/settings/settings-page-content'
export const dynamic = 'force-dynamic'

export default function AdminSettingsPage() {
  return (
    <div className="px-8 pb-12 pt-24">
      <SettingsPageContent mode="admin" />
    </div>
  )
}
