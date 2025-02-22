# Use slim version for smaller image size
FROM python:3.13-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Create a non-root user
RUN groupadd -r dev && useradd -r -g dev dev

# Install required system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    pkg-config \
    cmake \
    make \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Multi-stage build for smaller final image
FROM python:3.13-slim

# Copy environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create dev in the final image
RUN groupadd -r dev && useradd -r -g dev dev

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy application code
COPY --chown=dev:dev . .

# Switch to non-root user
USER dev

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--reload"]
