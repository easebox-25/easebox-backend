package main

import (
	"os";
	"fmt";
	"log";
	"github.com/easebox-25/easebox-backend/util"

	"github.com/joho/godotenv"
	"github.com/gin-gonic/gin"
)

func main() {
	err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }
	gin.SetMode(gin.DebugMode)
	router := gin.Default()
	router.SetTrustedProxies([]string{os.Getenv("TRUSTED_PROXIES")})

	router.GET("/health", func(c *gin.Context) {
		// c.JSON(200, gin.H{
		// 	"status": "ok",
		// })
		util.OK(c, gin.H{"status": "ok"}, 201)
	})

	port := os.Getenv("APP_PORT")

	fmt.Println("PORT:", port)

	router.Run(port)
}