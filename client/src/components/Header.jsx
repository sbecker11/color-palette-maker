function Header({ theme, onToggleTheme }) {
  return (
    <header>
      <h1>
        Color Palette Maker (React)
        <span className="header-tech">React • Vite</span>
      </h1>
      <button id="themeToggleButton" onClick={onToggleTheme}>
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>
    </header>
  );
}

export default Header;
