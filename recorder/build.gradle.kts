plugins {
    application
}

group = "dev.javavisuals"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.22.4")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.22.4")

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    mainClass = "dev.javavisuals.recorder.Main"
}

tasks.test {
    useJUnitPlatform()
}

tasks.named<JavaExec>("run") {
    // Resolve relative lesson paths from the repo root, not recorder/.
    workingDir = rootDir.parentFile
}
