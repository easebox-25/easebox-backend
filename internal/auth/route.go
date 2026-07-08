package auth

import (
	"github.com/gin-gonic/gin"

)

func RegisterAuthRoutes(router *gin.RouterGroup, authHandler *AuthHandler) {
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", authHandler.login)
		authGroup.POST("/signup", authHandler.signUp)
	}
}