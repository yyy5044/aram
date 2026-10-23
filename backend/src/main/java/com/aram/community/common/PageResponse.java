package com.aram.community.common;

import java.util.List;
import org.springframework.data.domain.Page;

/** 목록 응답. 페이지 번호는 1부터 세요. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

	public static <T> PageResponse<T> of(Page<T> page) {
		return new PageResponse<>(page.getContent(), page.getNumber() + 1, page.getSize(), page.getTotalElements(),
				page.getTotalPages());
	}

}
