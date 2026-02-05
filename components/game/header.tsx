export function Header() {
  return (
    <header className="flex flex-col items-center border-b border-border bg-card px-4 py-3 lg:items-start lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
      <h1 className="text-xl font-bold tracking-tight text-primary">
        FRET WARS
      </h1>
      <p className="text-xs tracking-widest text-muted-foreground">
        A StringTree Game
      </p>
    </header>
  )
}
