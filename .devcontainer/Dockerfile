FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    bash \
    git \
    openssh-client \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Setup SSH directory for SSH agent forwarding
RUN mkdir -p /home/node/.ssh && chown -R node:node /home/node/.ssh

# Install the Pulumi CLI
RUN curl -fsSL https://get.pulumi.com | sh -s -- --install-root "/home/node/.pulumi"
ENV PATH="/home/node/.pulumi/bin:${PATH}"

RUN npm install -g nx@v22.3.3
