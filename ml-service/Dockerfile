# 1. Use official Python 3.10 Debian-slim image (~120MB)
FROM python:3.10-slim

# 2. Set environment flags to optimize Python for containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Install system-level dependency for LightGBM (OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 4. Set the working directory inside the container
WORKDIR /app

# 5. Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# 6. Install Python dependencies without caching downloaded wheels
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy the rest of the ML application code
COPY . .

# 8. Expose the internal port where FastAPI listens
EXPOSE 8000

# 9. Start Uvicorn server (removed --reload for cleaner production logs)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]