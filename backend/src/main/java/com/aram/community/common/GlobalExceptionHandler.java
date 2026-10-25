package com.aram.community.common;

import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ErrorResponse> handleApi(ApiException e) {
		return respond(e.code(), e.fieldErrors());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorResponse> handleInvalid(MethodArgumentNotValidException e) {
		Map<String, String> fields = new LinkedHashMap<>();
		e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
		return respond(ErrorCode.INVALID_INPUT, fields.isEmpty() ? null : fields);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException e) {
		Map<String, String> fields = new LinkedHashMap<>();
		e.getParameterValidationResults().forEach(r -> {
			String name = r.getMethodParameter().getParameterName();
			r.getResolvableErrors().forEach(err -> fields.putIfAbsent(name, err.getDefaultMessage()));
		});
		return respond(ErrorCode.INVALID_INPUT, fields.isEmpty() ? null : fields);
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
			MissingServletRequestParameterException.class, MissingServletRequestPartException.class,
			MultipartException.class })
	ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
		return respond(ErrorCode.INVALID_INPUT, null);
	}

	/** multipart 한도(210MB)에서 Spring이 먼저 막은 경우. 어디에 올리던 중인지에 맞는 문구를 줘요. */
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException e, HttpServletRequest request) {
		boolean video = request.getRequestURI().startsWith("/api/videos");
		return respond(video ? ErrorCode.VIDEO_TOO_LARGE : ErrorCode.IMAGE_TOO_LARGE, null);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException e) {
		return respond(ErrorCode.NOT_FOUND, null);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
		return respond(ErrorCode.METHOD_NOT_ALLOWED, null);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
		log.error("Unexpected error", e);
		return respond(ErrorCode.INTERNAL_ERROR, null);
	}

	private ResponseEntity<ErrorResponse> respond(ErrorCode code, Map<String, String> fieldErrors) {
		return ResponseEntity.status(code.status()).body(ErrorResponse.of(code, fieldErrors));
	}

}
