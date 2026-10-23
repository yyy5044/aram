package com.aram.community.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String code, String message, Map<String, String> fieldErrors) {

	public static ErrorResponse of(ErrorCode code) {
		return new ErrorResponse(code.name(), code.message(), null);
	}

	public static ErrorResponse of(ErrorCode code, Map<String, String> fieldErrors) {
		return new ErrorResponse(code.name(), code.message(), fieldErrors);
	}

}
