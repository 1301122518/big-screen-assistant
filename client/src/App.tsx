import React, { useState, useEffect } from 'react'
import ConfigPage from './pages/ConfigPage'
import PlayerPage from './pages/PlayerPage'

type Page = 'config' | 'player'

/**
 * App 根组件
 * 根据 hash 路由切换配置页和播放页
 */
const App: React.FC = () => {
  const [page, setPage] = useState<Page>('config')

  useEffect(() => {
    const updatePage = () => {
      const hash = window.location.hash
      if (hash.includes('/player')) {
        setPage('player')
      } else {
        setPage('config')
      }
    }

    updatePage()
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  if (page === 'player') {
    return <PlayerPage />
  }

  return <ConfigPage />
}

export default App
