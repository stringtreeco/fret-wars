interface HeaderProps {
  onMenu?: () => void
}

export function Header({ onMenu }: HeaderProps) {
  return (
    <header className="flex flex-col items-center gap-2 border-b border-border bg-card px-4 py-3 lg:items-start lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            FRET WARS
          </h1>
          <p className="text-xs tracking-widest text-muted-foreground">
            A StringTree Game
          </p>
        </div>
        {onMenu && (
          <button
            onClick={onMenu}
            className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80"
          >
            Menu
          </button>
        )}
      </div>
    </header>
  )
}
