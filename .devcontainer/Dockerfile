FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    openssh-client \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Setup SSH directory for SSH agent forwarding
RUN mkdir -p /home/node/.ssh && chown -R node:node /home/node/.ssh

# Install any global npm packages
RUN npm install -g \
    @anthropic-ai/claude-code \
    vite 
