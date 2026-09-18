.PHONY: help install test-backend frontend-install frontend-dev frontend-build

help:
	@echo "install           Editable Python package from backend/ plus frontend npm install"
	@echo "test-backend      Run pytest in backend/"
	@echo "frontend-dev      Vite dev server"
	@echo "frontend-build    Typecheck and build the frontend"

install:
	python3.12 -m pip install -e "./backend[dev]"
	$(MAKE) frontend-install

test-backend:
	cd backend && pytest

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
