package com.olima.common;

import com.olima.auth.exception.InvalidCredentialsException;
import com.olima.conversation.exception.ConversationNotFoundException;
import com.olima.knowledge.exception.DocumentParseException;
import com.olima.knowledge.exception.KnowledgeBaseNotFoundException;
import com.olima.organization.exception.OrganizationNotFoundException;
import com.olima.telegram.exception.TelegramApiException;
import com.olima.tool.exception.ToolNotFoundException;
import com.olima.user.exception.DuplicateUsernameException;
import com.olima.user.exception.UserNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OrganizationNotFoundException.class)
    public ResponseEntity<ApiError> handleOrganizationNotFound(OrganizationNotFoundException ex) {
        log.warn("Organization not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ToolNotFoundException.class)
    public ResponseEntity<ApiError> handleToolNotFound(ToolNotFoundException ex) {
        log.warn("Tool not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ConversationNotFoundException.class)
    public ResponseEntity<ApiError> handleConversationNotFound(ConversationNotFoundException ex) {
        log.warn("Conversation not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(KnowledgeBaseNotFoundException.class)
    public ResponseEntity<ApiError> handleKnowledgeBaseNotFound(KnowledgeBaseNotFoundException ex) {
        log.warn("Knowledge base not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(DocumentParseException.class)
    public ResponseEntity<ApiError> handleDocumentParseException(DocumentParseException ex) {
        log.warn("Failed to parse uploaded document: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("Uploaded file exceeds the allowed size: {}", ex.getMessage());
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Yuklangan fayl hajmi ruxsat etilgan limitdan oshib ketdi");
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiError> handleUserNotFound(UserNotFoundException ex) {
        log.warn("User not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ApiError> handleDuplicateUsername(DuplicateUsernameException ex) {
        log.warn("Duplicate username: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException ex) {
        log.warn("Login failed: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "You do not have permission to perform this action");
    }

    @ExceptionHandler(TelegramApiException.class)
    public ResponseEntity<ApiError> handleTelegramApiException(TelegramApiException ex) {
        log.warn("Telegram API error: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Validatsiya xatoligi yuz berdi");
    }

    /**
     * Kutilmagan xato. Matni MIJOZGA CHIQMAYDI — chat widget'i mijoz saytida ochiq turadi,
     * ya'ni bu yerdagi har qanday satr sayt tashrifchisiga ko'rinadi. Amalda u yerga
     * "com.openai.errors.UnauthorizedException: 401: You didn't provide an API key..."
     * chiqib qoldi: ichki tafsilot ham, sozlash muammosi ham begona odamga ko'rindi.
     *
     * Endi tashqariga faqat umumiy matn va qidiruv kodi ketadi; to'liq tafsilot logda.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGenericException(Exception ex) {
        String ref = java.util.UUID.randomUUID().toString().substring(0, 8);
        log.error("Internal server error [ref={}]: ", ref, ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ichki xatolik yuz berdi. Qayta urinib ko'ring (kod: " + ref + ")");
    }

    private ResponseEntity<ApiError> buildResponse(HttpStatus status, String message) {
        ApiError error = new ApiError(status.value(), status.getReasonPhrase(), message, Instant.now());
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(error);
    }
}
