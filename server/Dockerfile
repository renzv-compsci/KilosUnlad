# 1. Use the documented Node 20 runtime, satisfying dependency engine requirements.
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# 4. Install dependencies inside container
RUN npm ci

# 5. Copy the rest of the backend source code
COPY . .

# 6. Expose the port where Express listens
EXPOSE 5000

# 7. Start the server with nodemon for live hot-reloading during development
CMD ["node", "server.js"]
