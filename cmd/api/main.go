package main

import (
	"log";
	"github.com/easebox-25/easebox-backend/util"
	"github.com/easebox-25/easebox-backend/pkg/config"
	"github.com/easebox-25/easebox-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	
	gin.SetMode(gin.DebugMode)
	router := gin.Default()
	router.SetTrustedProxies(cfg.Proxy.TrustedProxies)

	router.GET("/health", func(c *gin.Context) {
		util.OK(c, gin.H{"status": "ok"}, 201)
	})

	v1 := router.Group("/api/v1")

	auth.Register(v1)

	port := cfg.PORT

	router.Run(port)
}