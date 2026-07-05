package util

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AppError struct {
  Status  int    `json:"-"`
  Code    string `json:"code"`
  Message string `json:"message"`
}

func (e *AppError) Error() string {
  return e.Message
}

var (
	// Client errors
  ErrNotFound     = &AppError{Status: 404, Code: "NOT_FOUND", Message: "resource not found"}
  ErrUnauthorized = &AppError{Status: 401, Code: "UNAUTHORIZED", Message: "authentication required"}
  ErrBadRequest   = &AppError{Status: 400, Code: "BAD_REQUEST", Message: "invalid request"}
	ErrForbidden   = &AppError{Status: 403, Code: "FORBIDDEN", Message: "you do not have permission to access this resource"}

	// Server errors
	ErrInternal    = &AppError{Status: 500, Code: "INTERNAL", Message: "an unexpected error occurred"}
	
)

// ErrorHandler is a middleware that catches errors set via c.Error().
func ErrorHandler() gin.HandlerFunc {
  return func(c *gin.Context) {
    c.Next()

    if len(c.Errors) == 0 {
      return
    }

    err := c.Errors.Last().Err
    var appErr *AppError
    if errors.As(err, &appErr) {
      c.JSON(appErr.Status, gin.H{
        "success": false,
        "error":   gin.H{"code": appErr.Code, "message": appErr.Message},
      })
    } else {
      c.JSON(http.StatusInternalServerError, gin.H{
        "success": false,
        "error":   gin.H{"code": "INTERNAL", "message": "an unexpected error occurred"},
      })
    }
  }
}