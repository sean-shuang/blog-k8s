FROM docker.m.daocloud.io/library/ubuntu:22.04
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY app.js .
EXPOSE 8080
CMD ["node", "app.js"]
