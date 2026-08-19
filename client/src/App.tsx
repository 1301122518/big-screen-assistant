import React, { useState } from 'react'
import PlayerPage from './pages/PlayerPage'

type Page = 'player'

/**
 * App 根组件
 * 直接进入播放页（配置从 config.json 读取）
 */
const App: React.FC = () => {
  const [page] = useState<Page>('player')

  if (page === 'player') {
    return <PlayerPage />
  }

  return null
}

export default App
