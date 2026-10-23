package com.aram.community.support;

import com.aram.community.TestcontainersConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 실제 PostgreSQL(Testcontainers)로 도는 통합 테스트 기반. 테스트마다 테이블을 비워요. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

	@Autowired
	protected MockMvc mockMvc;

	@Autowired
	protected JdbcTemplate jdbc;

	@BeforeEach
	void cleanDatabase() {
		List<String> tables = jdbc.queryForList(
				"select tablename from pg_tables where schemaname = 'public' and tablename <> 'flyway_schema_history'",
				String.class);
		if (!tables.isEmpty()) {
			jdbc.execute("truncate table " + String.join(", ", tables) + " restart identity cascade");
		}
	}

}
