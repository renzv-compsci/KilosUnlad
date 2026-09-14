# 1. Use the official lightweight Node 18 Alpine Linux image (~150MB)
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# 4. Install all frontend dependencies (React, Vite, Tailwind, Dexie, etc.)
RUN npm install

# 5. Copy the rest of the frontend source code
COPY . .

# 6. Expose the port where Vite runs
EXPOSE 3000

# 7. Start the Vite development server with external host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]