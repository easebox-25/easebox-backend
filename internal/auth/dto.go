package auth


type LoginByEmailRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	OTP			string `json:"otp" binding:"required"`
}

type LoginByPhoneRequest struct {
	PhoneNumber string `json:"phoneNumber" binding:"required"`
	Password    string `json:"password" binding:"required"`
	OTP			string `json:"otp" binding:"required"`
}


type RegisterRequest struct {
	FirstName   string `json:"firstName" binding:"required"`
	LastName    string `json:"lastName" binding:"required"`
	PhoneNumber string `json:"phoneNumber" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required"`
}

type UpdateUserRequest struct {
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	PhoneNumber string `json:"phoneNumber"`
	Email       string `json:"email" binding:"omitempty,email"`
}