package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	App AppConfig
	DB  DatabaseConfig
	Redis RedisConfig
	Proxy ProxyConfig
	PORT string
}

type AppConfig struct {
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
}

type RedisConfig struct {
	Host string
	Port string
}

type ProxyConfig struct {
	TrustedProxies []string
}


func Load() (*Config, error) {

	env := getEnvOrDefault("APP_ENV", "local")

	if env != "production" {
		_ = godotenv.Load(fmt.Sprintf("configs/.env.%s", env))
	}

	cfg := &Config{
		App: AppConfig{
			Env:  getRequiredEnv("APP_ENV"),
			Port: getRequiredEnv("APP_PORT"),
		},

		DB: DatabaseConfig{
			Host:     getRequiredEnv("DB_HOST"),
			Port:     getRequiredEnv("DB_PORT"),
			Name:     getRequiredEnv("DB_NAME"),
			User:     getRequiredEnv("DB_USER"),
			Password: getRequiredEnv("DB_PASSWORD"),
		},

		Redis: RedisConfig{
			Host: getRequiredEnv("REDIS_HOST"),
			Port: getRequiredEnv("REDIS_PORT"),
		},

		Proxy: ProxyConfig{
			TrustedProxies: getEnvAsSlice("TRUSTED_PROXIES"),
		},
		PORT: getEnvOrDefault("APP_PORT", ":8080"),
	}

	return cfg, nil
}

func getRequiredEnv(key string) string {
	value := os.Getenv(key)

	if value == "" {
		panic(fmt.Sprintf("required environment variable %s is missing", key))
	}

	return value
}

func getEnvOrDefault(key, fallback string) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}

func getEnvAsSlice(key string) []string {
	value := os.Getenv(key)

	if value == "" {
		return []string{}
	}

	items := strings.Split(value, ",")

	for i := range items {
		items[i] = strings.TrimSpace(items[i])
	}

	return items
}