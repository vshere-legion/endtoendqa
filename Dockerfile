# ─── Stage 1: Install dependencies ────────────────────────
FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS deps

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Test runner ─────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS runner

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy framework source
COPY . .

# Generate BDD test files
RUN npx bddgen

# Default environment variables
ENV TEST_ENV=staging \
    ENTERPRISE=LegionCoffee \
    WORKERS=4 \
    RETRY_COUNT=1 \
    HEADED=false \
    LOG_LEVEL=INFO \
    LOG_TO_FILE=true \
    CI=true

# Create reports directory
RUN mkdir -p reports/html reports/json reports/junit reports/cucumber reports/logs reports/screenshots

# Health check - verify playwright browsers are available
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npx playwright --version || exit 1

# Default: run all tests
ENTRYPOINT ["npx", "playwright", "test"]

# Allow passing extra args (e.g., --project=chromium --grep @P1-Critical)
CMD []
