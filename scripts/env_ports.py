#!/usr/bin/env python3
"""
Load port numbers from a .env file. Use from scripts or other Python code.

Python usage:
    from env_ports import get_ports_from_env
    ports = get_ports_from_env("/path/to/project/.env", defaults={"EXPRESS_PORT": 3000, "VITE_DEV_PORT": 5173})
    port = ports["EXPRESS_PORT"]
"""

import os
from pathlib import Path


def _parse_env_file(path: Path) -> dict[str, str]:
    """Parse .env file into key -> value (string). No variable expansion."""
    env = {}
    if not path.exists():
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            eq = line.find("=")
            if eq == -1:
                continue
            key = line[:eq].strip()
            val = line[eq + 1 :].strip()
            if (val.startswith('"') and val.endswith('"')) or (
                val.startswith("'") and val.endswith("'")
            ):
                val = val[1:-1]
            env[key] = val
    return env


def get_ports_from_env(
    env_path: str | Path | None = None,
    defaults: dict[str, int] | None = None,
) -> dict[str, int]:
    """
    Load .env from env_path (or cwd), parse it, and return port values for the given keys.

    :param env_path: Path to .env file. If None, uses .env in current working directory.
    :param defaults: Map of env var name -> default port if missing/invalid.
    :return: Map of env var name -> port number (int).
    """
    if defaults is None:
        defaults = {}
    resolved = (
        Path(env_path).resolve()
        if env_path is not None
        else Path.cwd() / ".env"
    )
    env = _parse_env_file(resolved)
    result = {}
    for key, default in defaults.items():
        raw = env.get(key) or os.environ.get(key)
        try:
            num = int(raw) if raw is not None else default
        except (TypeError, ValueError):
            num = default
        if not (0 < num < 65536):
            num = default
        result[key] = num
    return result


def load_dotenv_and_get_ports(
    env_path: str | Path | None = None,
    defaults: dict[str, int] | None = None,
) -> dict[str, int]:
    """
    Load .env with python-dotenv (if available), then return ports.
    Mutates os.environ so child processes see the vars.
    """
    if defaults is None:
        defaults = {}
    resolved = (
        Path(env_path).resolve()
        if env_path is not None
        else Path.cwd() / ".env"
    )
    try:
        from dotenv import load_dotenv
        load_dotenv(resolved)
    except ImportError:
        pass
    return get_ports_from_env(resolved, defaults)
