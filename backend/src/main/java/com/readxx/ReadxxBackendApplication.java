package com.readxx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ReadxxBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ReadxxBackendApplication.class, args);
	}

}
