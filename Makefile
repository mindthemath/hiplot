install:
	bun install
	uv sync --all-extras

clean:
	rm -rf node_modules .venv

build:
	bun run build
	uv build

test:
	uv run pytest hiplot --durations=10

check:
	# uv run mypy --strict --implicit-reexport hiplot
	uv run ty check

dev:
	uv run hiplot --port 8765
