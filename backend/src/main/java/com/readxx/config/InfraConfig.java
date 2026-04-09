package com.readxx.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class InfraConfig {

    @Bean
    public WebClient openAiWebClient(WebClient.Builder builder) {
        return builder.baseUrl("https://api.openai.com").build();
    }

    @Bean(name = "ttsAudioRedisTemplate")
    @ConditionalOnProperty(prefix = "readxx.tts", name = "enabled", havingValue = "true", matchIfMissing = true)
    public RedisTemplate<String, byte[]> ttsAudioRedisTemplate(
        RedisConnectionFactory connectionFactory
    ) {
        RedisTemplate<String, byte[]> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(RedisSerializer.byteArray());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(RedisSerializer.byteArray());
        template.afterPropertiesSet();
        return template;
    }
}
