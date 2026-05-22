import { BODUVALASA_LAYOUT } from './boduvalasa-layout'
import fs from 'fs'
import path from 'path'

export function exportLayoutToBlender() {
  const layoutData = {
    viewBox: BODUVALASA_LAYOUT.viewBox,
    plots: BODUVALASA_LAYOUT.plotMarks.map((mark: any) => ({
      n: mark.n,
      x: mark.x,
      y: mark.y,
      extent: mark.extent || 120,
    })),
    segments: BODUVALASA_LAYOUT.segments,
  }

  const json = JSON.stringify(layoutData, null, 2)
  const filePath = path.join(process.cwd(), 'public', 'boduvalasa-layout.json')
  
  fs.writeFileSync(filePath, json)
  console.log(`✅ Exported to ${filePath}`)
  console.log(`📊 ${layoutData.plots.length} plots`)
  console.log(`📊 ${layoutData.segments.length} road segments`)
}

exportLayoutToBlender()