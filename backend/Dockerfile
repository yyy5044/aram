# 백엔드 운영 이미지. 저장소 루트에서 만들어요: docker build -f backend/Dockerfile .

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
# 의존성 받기를 먼저 해 두면, 소스만 바뀌었을 때 이 층을 다시 쓰여요.
COPY backend/gradlew backend/build.gradle backend/settings.gradle ./
COPY backend/gradle ./gradle
RUN sh ./gradlew dependencies --no-daemon -q > /dev/null
COPY backend/src ./src
RUN sh ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
RUN useradd --system --create-home app \
	&& mkdir -p /data/images \
	&& chown app:app /data/images
WORKDIR /app
COPY --from=build /src/build/libs/app.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod \
	JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
