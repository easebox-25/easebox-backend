package auth

import (
	"github.com/gin-gonic/gin"
)

func Register(router *gin.RouterGroup) {

	service := NewAuthService()
	handler := NewAuthHandler(service)

	RegisterAuthRoutes(router, handler)
}