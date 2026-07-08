package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *AuthService
}

func NewAuthHandler(authService *AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) signUp(c *gin.Context) {
	// Implement sign-up logic here
	c.JSON(http.StatusOK, gin.H{"message": "Sign-up successful"})
}

func (h *AuthHandler) login(c *gin.Context) {
	// Implement login logic here
	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
}