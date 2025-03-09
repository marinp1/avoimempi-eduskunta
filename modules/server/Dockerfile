# Use the official Bun image as a base image
FROM oven/bun:1.2.4-alpine

# Set the working directory
WORKDIR /app/

# Copy package.json and package-lock.json from the root level
COPY ./package.json ./bun.lock ./tsconfig.json ./tsconfig.common.json  ./

# Copy the rest of the application code
COPY ./modules/server ./modules/server/

# Install dependencies
RUN bun install --filter "avoimempi-eduskunta-server"

# Expose the port the app runs on
EXPOSE 5600

# Command to run the application
CMD ["bun", "run", "modules/server/src/index.mts"]