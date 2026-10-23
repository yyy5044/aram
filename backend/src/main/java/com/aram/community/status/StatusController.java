package com.aram.community.status;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 서버와 DB가 살아 있는지 확인하는 API. 프론트엔드 첫 화면에서 연결 확인용으로 써요.
 */
@RestController
@RequestMapping("/api/status")
public class StatusController {

	private final JdbcTemplate jdbcTemplate;

	public StatusController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping
	public StatusResponse status() {
		String version = jdbcTemplate.queryForObject("show server_version", String.class);
		String shortVersion = version == null ? "unknown" : version.split(" ")[0];
		return new StatusResponse("ok", "PostgreSQL " + shortVersion);
	}

}
