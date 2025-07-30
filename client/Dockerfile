# Stage 1: Build the React application
FROM node:20-alpine as build

# Set the working directory inside the container for the client application
WORKDIR /app/client

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install client-side application dependencies
RUN npm install

# Copy the rest of the client application code
COPY . .

# Build the React application for production
# This command assumes your client's package.json has a "build" script
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
# This configuration tells Nginx to serve the static files from the build directory
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React application from the build stage
COPY --from=build /app/client/build /usr/share/nginx/html

# Expose port 80 for the Nginx web server
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
