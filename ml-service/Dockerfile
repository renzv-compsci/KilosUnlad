# 1. Use official Python 3.10 Debian-slim image (~120MB)
FROM python:3.10-slim

# 2. Set environment flags to optimize Python for containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# 5. Install Python dependencies without caching downloaded wheels
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the ML application code
COPY . .

# 7. Expose the internal port where FastAPI listens
EXPOSE 8000

# 8. Start Uvicorn server with hot-reload enabled for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]