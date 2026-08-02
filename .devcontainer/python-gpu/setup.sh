#!/bin/bash

echo "Running devcontainer setup script..."

# Install npm dependencies 
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install --verbose
else
  echo "Npm dependencies already installed"
fi

npm install -g nx@v22.7.1 

# Add any additional setup commands here
echo "Setup script completed!"
