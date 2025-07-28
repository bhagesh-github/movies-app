# Use an official Node.js runtime as a parent image for the server
FROM node:20-alpine

# Set the working directory inside the container for the server application
WORKDIR /app/server

# Copy package.json and package-lock.json (if available) for dependency installation
# This leverages Docker's layer caching for faster builds
COPY server/package*.json ./

# Install server-side application dependencies
# The --omit=dev flag ensures that development dependencies are not included in the production image
RUN npm install --omit=dev

# Copy the rest of the server application code
COPY server/ .

# Expose the port the Node.js server runs on
# Assuming your Node.js server listens on port 5000. Adjust if different.
EXPOSE 5000

# Define the command to run your Node.js server
# This assumes you have a "start" script defined in your server's package.json
CMD ["npm", "start"]
