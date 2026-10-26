package com.aram.community.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.PlatformTransactionManager;

class PostViewCounterTest {

	@Test
	void transactionFailureDoesNotBreakThePage() {
		PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
		when(transactions.getTransaction(any())).thenThrow(new CannotCreateTransactionException("DB가 꺼져 있어요"));
		PostViewCounter counter = new PostViewCounter(mock(JdbcTemplate.class), transactions);

		assertThat(counter.count(1L, 2L, null)).isFalse();
	}

}
