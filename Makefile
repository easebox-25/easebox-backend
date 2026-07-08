-include .env
export 

DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@localhost:5432/$(DB_NAME)?sslmode=disable

migration:
	migrate create -ext sql -dir migrations -seq $(name)

migrate-up:
	migrate -path migrations -database $(DB_URL) up

migrate-down:
	migrate -path migrations -database $(DB_URL) down

run:
	go run cmd/api/main.go