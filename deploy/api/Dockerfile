# syntax=docker/dockerfile:1.7
# Kontekst — repo ildizi (deploy/docker-compose.yml: context: ..)
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY olima-backend/pom.xml olima-backend/
COPY mock-government/pom.xml mock-government/
COPY olima-backend/src olima-backend/src
# .m2 kesh mount'i: har deploy'da bog'liqliklar qayta yuklanmaydi
RUN --mount=type=cache,target=/root/.m2 \
    chmod +x mvnw && ./mvnw -B -q package -pl olima-backend -am -DskipTests \
    && cp olima-backend/target/olima-backend-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=build /app.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
