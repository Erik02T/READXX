package com.readxx.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "readxx.tts")
public class ReadxxTtsProperties {

    private String openaiApiKey;

    @Min(0)
    private int dailyLimitFree = 10_000;

    @Min(0)
    private int dailyLimitPremium = 500_000;

    public String getOpenaiApiKey() {
        return openaiApiKey;
    }

    public void setOpenaiApiKey(String openaiApiKey) {
        this.openaiApiKey = openaiApiKey;
    }

    public int getDailyLimitFree() {
        return dailyLimitFree;
    }

    public void setDailyLimitFree(int dailyLimitFree) {
        this.dailyLimitFree = dailyLimitFree;
    }

    public int getDailyLimitPremium() {
        return dailyLimitPremium;
    }

    public void setDailyLimitPremium(int dailyLimitPremium) {
        this.dailyLimitPremium = dailyLimitPremium;
    }
}
