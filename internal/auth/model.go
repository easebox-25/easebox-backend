package auth

import (
	"time"
)

type User struct {
	ID string `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	FirstName string `gorm:"column:first_name, varchar(50)" json:"firstName"`
	LastName  string `gorm:"column:last_name, varchar(50)" json:"lastName"`
	PhoneNumber  string `gorm:"column:phone_number, varchar(20)" json:"phoneNumber"`
	Email  string `gorm:"column:email; not null" json:"email"`
	Password string `gorm:"column:password; not null" json:"password"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}