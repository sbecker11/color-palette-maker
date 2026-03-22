function IconMoon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="theme-toggle-icon"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="theme-toggle-icon"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function Header({ theme, onToggleTheme, onTitleClick, onAboutClick }) {
  const themeToggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header>
      <h1>
        <span
          className={`hero-title${onTitleClick ? ' hero-title-clickable' : ''}`}
          role={onTitleClick ? 'button' : undefined}
          tabIndex={onTitleClick ? 0 : undefined}
          onClick={onTitleClick}
          onKeyDown={
            onTitleClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTitleClick();
                  }
                }
              : undefined
          }
        >
          Color <em className="hero-title-palette">Palette</em> Maker
        </span>
        <span className="header-tech">React • Vite</span>
      </h1>
      <nav className="header-nav">
        {onAboutClick && (
          <a href="/about.html" className="header-about-link" onClick={(e) => { e.preventDefault(); onAboutClick(); }}>About</a>
        )}
        <button
          type="button"
          id="themeToggleButton"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </nav>
    </header>
  );
}

export default Header;
