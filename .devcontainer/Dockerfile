# Browser-only IFC viewer: Vite + TypeScript + Three.js + web-ifc.
# Playwright Chrome and its OS deps are installed in postCreateCommand
# via `npx playwright install --with-deps chrome`.
FROM mcr.microsoft.com/devcontainers/javascript-node:22

# --- Optional corporate CA (Zscaler TLS inspection) ---
# The cert is local-only and git-ignored (see .gitignore). If a
# .devcontainer/zscaler.crt exists it is trusted for curl, apt, git, and
# node/npm so builds succeed behind the proxy; if it is absent the build still
# works for contributors who are not behind Zscaler.
# The wildcard source plus the sentinel file guarantees COPY never fails when
# the cert is missing.
COPY zscaler.cr[t] optional-ca-placeholder* /tmp/ca/
RUN set -eux; \
    if [ -f /tmp/ca/zscaler.crt ]; then \
        cp /tmp/ca/zscaler.crt /usr/local/share/ca-certificates/zscaler.crt; \
        update-ca-certificates; \
        echo "cafile=/etc/ssl/certs/ca-certificates.crt" >> /etc/npmrc; \
    fi; \
    rm -rf /tmp/ca
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
    GIT_SSL_CAINFO=/etc/ssl/certs/ca-certificates.crt

# --- System packages: ffmpeg (media processing) ---
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg; \
    rm -rf /var/lib/apt/lists/*

# --- uv (Python package & venv manager) ---
# Installed to a system location so it is on PATH for the non-root `node` user.
ENV UV_INSTALL_DIR=/usr/local/bin
RUN set -eux; \
    curl -LsSf https://astral.sh/uv/install.sh | sh; \
    uv --version

# --- Python virtual environment with required packages ---
# Created at /opt/venv and owned by `node` so the dev user can modify it.
ENV VIRTUAL_ENV=/opt/venv
RUN set -eux; \
    uv venv "$VIRTUAL_ENV" --python 3.12; \
    VIRTUAL_ENV="$VIRTUAL_ENV" uv pip install pandas; \
    chown -R node:node "$VIRTUAL_ENV"
# Put the venv first on PATH so `python` and installed tools resolve to it.
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
