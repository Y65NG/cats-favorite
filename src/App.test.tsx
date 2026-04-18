import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the toybox home screen in Chinese with four mini-games', () => {
    render(<App />)

    expect(screen.getByText('猫咪能力测试')).toBeInTheDocument()
    expect(screen.getByText('已完成 0 / 4')).toBeInTheDocument()
    expect(screen.getByText('看小猫想先玩哪个')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '激光点点 开始游戏' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '小鱼乱游 开始游戏' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '羽毛追追 开始游戏' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '虫虫突袭 开始游戏' })).toBeInTheDocument()
  })

  it('removes the extra touch-priority footer sentence', () => {
    render(<App />)

    expect(
      screen.queryByText('触控优先设计，平板上点按面积更大，也保留桌面可试玩体验。'),
    ).not.toBeInTheDocument()
  })
})
