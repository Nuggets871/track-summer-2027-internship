SHELL := /bin/bash

# Stamp file created once dependencies are installed, so `make dev` can install
# on a fresh clone but stay instant afterwards.
STAMP := node_modules/.install-stamp

.PHONY: help install dev db migrate seed reset build start test test-watch lint studio clean

help:
	@echo "Stage Copilot - available commands:"
	@echo "  make dev         Install if needed, apply migrations, start the dev server"
	@echo "  make install     Install dependencies"
	@echo "  make db          Apply pending Prisma migrations (non-interactive)"
	@echo "  make migrate     Create/apply a migration in development"
	@echo "  make seed        Load demo data"
	@echo "  make reset       Reset the database and reseed (destructive)"
	@echo "  make build       Production build"
	@echo "  make start       Serve the production build"
	@echo "  make test        Run the test suite"
	@echo "  make test-watch  Run tests in watch mode"
	@echo "  make lint        Run ESLint"
	@echo "  make studio      Open Prisma Studio"
	@echo "  make clean       Remove build artefacts and the install stamp"

install: $(STAMP)

$(STAMP): package.json package-lock.json
	npm install
	@touch $(STAMP)

# One command to run the whole project locally: install on first run, bring the
# database up to date, then start Next.js in the foreground (Ctrl+C to stop).
dev: $(STAMP)
	npx prisma migrate deploy
	npm run dev

db: $(STAMP)
	npx prisma migrate deploy

migrate: $(STAMP)
	npx prisma migrate dev

# Seed demo data. Depends on `db` so it also works on a fresh clone (migrations
# applied first). It is not run automatically by `make dev` on purpose: the
# seed is not idempotent, so running it twice would duplicate demo rows.
seed: db
	npm run db:seed

reset: $(STAMP)
	npm run db:reset

build: $(STAMP)
	npm run build

start:
	npm run start

test: $(STAMP)
	npm run test

test-watch:
	npm run test:watch

lint:
	npm run lint

studio: $(STAMP)
	npx prisma studio

clean:
	rm -rf .next
	rm -f $(STAMP)
