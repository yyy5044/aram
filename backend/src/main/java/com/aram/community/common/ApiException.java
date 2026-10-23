package com.aram.community.common;

import java.util.Map;

public class ApiException extends RuntimeException {

	private final ErrorCode code;

	private final Map<String, String> fieldErrors;

	public ApiException(ErrorCode code) {
		this(code, null);
	}

	public ApiException(ErrorCode code, Map<String, String> fieldErrors) {
		super(code.message());
		this.code = code;
		this.fieldErrors = fieldErrors;
	}

	public ErrorCode code() {
		return code;
	}

	public Map<String, String> fieldErrors() {
		return fieldErrors;
	}

}
