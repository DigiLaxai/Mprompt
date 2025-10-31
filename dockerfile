# Stage 1: Build the React/TypeScript application
# Use a Node.js image to build your frontend assets
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build your React application. This command might vary based on your setup (e.g., `npm run build`, `yarn build`).
# This command will typically output your static files into a directory like 'build' or 'dist'.
RUN npm run build

# Stage 2: Serve the static files with Nginx
# Use a lightweight Nginx image to serve the static content
FROM nginx:alpine

# Copy the Nginx configuration file
# Create a file named `nginx.conf` in your project root with the content below
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the builder stage to Nginx's web root
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
