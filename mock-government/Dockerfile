FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY mock-government/pom.xml mock-government/
RUN chmod +x mvnw && ./mvnw dependency:go-offline -pl mock-government -am -B
COPY mock-government/src mock-government/src
RUN ./mvnw package -pl mock-government -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/mock-government/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
