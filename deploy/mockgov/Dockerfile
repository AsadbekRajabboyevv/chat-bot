# syntax=docker/dockerfile:1.7
# Kontekst — repo ildizi (deploy/docker-compose.yml: context: ..)
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY olima-backend/pom.xml olima-backend/
COPY mock-government/pom.xml mock-government/
COPY mock-government/src mock-government/src
RUN --mount=type=cache,target=/root/.m2 \
    chmod +x mvnw && ./mvnw -B -q package -pl mock-government -am -DskipTests \
    && cp mock-government/target/mock-government-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=build /app.jar app.jar
USER app
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app/app.jar"]
