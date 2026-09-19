FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY olima-backend/pom.xml olima-backend/
COPY mock-government/pom.xml mock-government/
RUN chmod +x mvnw && ./mvnw dependency:go-offline -pl olima-backend -am -B
COPY olima-backend/src olima-backend/src
RUN ./mvnw package -pl olima-backend -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/olima-backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
