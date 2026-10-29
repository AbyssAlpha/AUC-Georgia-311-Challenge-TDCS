# Java 21 Virtual Threads for high-scale concurrency
spring.threads.virtual.enabled=true

# High-Performance Hikari Connection Pool Settings
spring.datasource.hikari.maximum-pool-size=50
spring.datasource.hikari.minimum-idle=10
spring.jpa.open-in-view=false

# Auto-create tables in embedded database
spring.jpa.hibernate.ddl-auto=update
spring.h2.console.enabled=true