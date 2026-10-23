package com.aram.community.common;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 예약 작업(데이터 동기화, 이미지 정리)은 app.scheduling.enabled=true일 때만 돌아요. 테스트에서는 꺼요. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class SchedulingConfig {

}
