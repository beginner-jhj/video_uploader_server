FROM node:20-slim

# FFmpeg 설치
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 복사 (캐싱 최적화)
COPY package*.json ./
RUN npm install --omit=dev

# 소스코드 복사
COPY . .

# 필수 디렉토리 생성
RUN mkdir -p uploads processed

# Railway가 자동으로 PORT 할당
EXPOSE 8080

CMD ["node", "server.js"]