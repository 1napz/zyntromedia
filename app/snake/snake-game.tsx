'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const GRID_SIZE = 20 // cells per row/column
const CELL = 22 // pixel size of each cell
const BOARD_PX = GRID_SIZE * CELL
const TICK_MS = 110 // movement speed

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type Status = 'idle' | 'playing' | 'over'

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
]

function randomFood(snake: Point[]): Point {
  while (true) {
    const food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    if (!snake.some((s) => s.x === food.x && s.y === food.y)) return food
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  // Mutable game state lives in refs so the game loop stays stable.
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE)
  const foodRef = useRef<Point>({ x: 14, y: 10 })
  const directionRef = useRef<Direction>('right')
  const nextDirectionRef = useRef<Direction>('right')
  const statusRef = useRef<Status>('idle')

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const styles = getComputedStyle(canvas)
    const bg = styles.getPropertyValue('--color-board').trim() || '#0a0a0a'
    const grid = styles.getPropertyValue('--color-grid').trim() || '#1f1f1f'
    const snakeColor =
      styles.getPropertyValue('--color-snake').trim() || '#22c55e'
    const headColor =
      styles.getPropertyValue('--color-snake-head').trim() || '#16a34a'
    const foodColor =
      styles.getPropertyValue('--color-food').trim() || '#ef4444'

    // Board
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX)

    // Grid lines
    ctx.strokeStyle = grid
    ctx.lineWidth = 1
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL + 0.5, 0)
      ctx.lineTo(i * CELL + 0.5, BOARD_PX)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL + 0.5)
      ctx.lineTo(BOARD_PX, i * CELL + 0.5)
      ctx.stroke()
    }

    // Food
    const food = foodRef.current
    ctx.fillStyle = foodColor
    ctx.beginPath()
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2 - 3,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // Snake
    const snake = snakeRef.current
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? headColor : snakeColor
      const pad = index === 0 ? 1 : 2
      const radius = 5
      const x = segment.x * CELL + pad
      const y = segment.y * CELL + pad
      const size = CELL - pad * 2
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, radius)
      ctx.fill()
    })
  }, [])

  const resetGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE.map((p) => ({ ...p }))
    foodRef.current = randomFood(snakeRef.current)
    directionRef.current = 'right'
    nextDirectionRef.current = 'right'
    setScore(0)
  }, [])

  const startGame = useCallback(() => {
    resetGame()
    statusRef.current = 'playing'
    setStatus('playing')
  }, [resetGame])

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (statusRef.current !== 'playing') return

      const direction = nextDirectionRef.current
      directionRef.current = direction
      const delta = DELTA[direction]
      const snake = snakeRef.current
      const newHead = {
        x: snake[0].x + delta.x,
        y: snake[0].y + delta.y,
      }

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        statusRef.current = 'over'
        setStatus('over')
        return
      }

      // Self collision
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        statusRef.current = 'over'
        setStatus('over')
        return
      }

      const ate =
        newHead.x === foodRef.current.x && newHead.y === foodRef.current.y
      const newSnake = [newHead, ...snake]
      if (ate) {
        foodRef.current = randomFood(newSnake)
        setScore((prev) => {
          const next = prev + 1
          setHighScore((hs) => (next > hs ? next : hs))
          return next
        })
      } else {
        newSnake.pop()
      }
      snakeRef.current = newSnake
      draw()
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [draw])

  // Initial draw
  useEffect(() => {
    draw()
  }, [draw])

  const changeDirection = useCallback((dir: Direction) => {
    if (statusRef.current !== 'playing') return
    // Prevent reversing directly into self
    if (dir === OPPOSITE[directionRef.current]) return
    nextDirectionRef.current = dir
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      const dir = keyMap[e.key]
      if (dir) {
        e.preventDefault()
        changeDirection(dir)
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (statusRef.current !== 'playing') startGame()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [changeDirection, startGame])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Score
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {score}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Best
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {highScore}
          </p>
        </div>
      </div>

      <div
        className="relative rounded-xl border border-border bg-card p-2 shadow"
        style={
          {
            '--color-board': 'var(--color-card)',
            '--color-grid': 'var(--color-border)',
            '--color-snake': 'var(--color-primary)',
            '--color-snake-head': 'var(--color-accent-foreground)',
            '--color-food': 'var(--color-destructive)',
          } as React.CSSProperties
        }
      >
        <canvas
          ref={canvasRef}
          width={BOARD_PX}
          height={BOARD_PX}
          className="block rounded-lg"
          style={{ width: BOARD_PX, height: BOARD_PX, maxWidth: '100%' }}
          aria-label="Snake game board"
          role="img"
        />

        {status !== 'playing' && (
          <div className="absolute inset-2 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/85 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-balance text-foreground">
              {status === 'over' ? 'Game Over' : 'Snake'}
            </h2>
            {status === 'over' && (
              <p className="text-sm text-muted-foreground">
                You scored {score} {score === 1 ? 'point' : 'points'}
              </p>
            )}
            <Button size="lg" onClick={startGame}>
              {status === 'over' ? 'Play Again' : 'Start Game'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Use arrow keys or WASD to move
            </p>
          </div>
        )}
      </div>

      {/* Touch / on-screen controls */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <div />
        <Button
          variant="secondary"
          size="lg"
          aria-label="Move up"
          onClick={() => changeDirection('up')}
        >
          ↑
        </Button>
        <div />
        <Button
          variant="secondary"
          size="lg"
          aria-label="Move left"
          onClick={() => changeDirection('left')}
        >
          ←
        </Button>
        <Button
          variant="secondary"
          size="lg"
          aria-label="Move down"
          onClick={() => changeDirection('down')}
        >
          ↓
        </Button>
        <Button
          variant="secondary"
          size="lg"
          aria-label="Move right"
          onClick={() => changeDirection('right')}
        >
          →
        </Button>
      </div>
    </div>
  )
}
