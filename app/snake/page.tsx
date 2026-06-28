import type { Metadata } from 'next'
import { SnakeGame } from './snake-game'

export const metadata: Metadata = {
  title: 'Snake Game',
  description:
    'A classic snake game — eat food to grow longer and beat your high score.',
}

export default function SnakePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-balance text-foreground">
          Snake
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Eat the food to grow. Avoid the walls and yourself.
        </p>
      </header>
      <SnakeGame />
    </main>
  )
}
