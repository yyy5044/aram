package com.aram.community.status;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import org.junit.jupiter.api.Test;

class StatusControllerTest extends IntegrationTest {

	@Test
	void reportsServerAndDatabaseStatus() throws Exception {
		mockMvc.perform(get("/api/status"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("ok"))
			.andExpect(jsonPath("$.database").value(startsWith("PostgreSQL 18")));
	}

}
