package httpapi

import (
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo"

type GoogleAuthConfig struct {
	ClientID         string
	ClientSecret     string
	PublicBaseURL    string
	AuthURL          string
	TokenURL         string
	UserInfoEndpoint string
}

type googleUserInfo struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

func (c GoogleAuthConfig) Enabled() bool {
	return strings.TrimSpace(c.ClientID) != "" && strings.TrimSpace(c.ClientSecret) != ""
}

func (c GoogleAuthConfig) LoginURL() string {
	if !c.Enabled() {
		return ""
	}

	if base := c.baseURL(); base != "" {
		return base + "/api/auth/google/start"
	}

	return "/api/auth/google/start"
}

func (c GoogleAuthConfig) RedirectURL(r *http.Request) string {
	base := c.baseURL()
	if base == "" {
		base = requestBaseURL(r)
	}

	return base + "/api/auth/google/callback"
}

func (c GoogleAuthConfig) RedirectHomeURL(r *http.Request, authError string) string {
	base := c.baseURL()
	if base == "" {
		base = requestBaseURL(r)
	}

	if authError == "" {
		return base + "/"
	}

	return base + "/?authError=" + url.QueryEscape(authError)
}

func (c GoogleAuthConfig) SecureCookies(r *http.Request) bool {
	if base := c.baseURL(); base != "" {
		return strings.HasPrefix(base, "https://")
	}

	scheme := requestScheme(r)
	return scheme == "https"
}

func (c GoogleAuthConfig) OAuth2Config(r *http.Request) *oauth2.Config {
	endpoint := google.Endpoint
	if customAuthURL := strings.TrimSpace(c.AuthURL); customAuthURL != "" {
		endpoint.AuthURL = customAuthURL
	}
	if customTokenURL := strings.TrimSpace(c.TokenURL); customTokenURL != "" {
		endpoint.TokenURL = customTokenURL
	}

	return &oauth2.Config{
		ClientID:     strings.TrimSpace(c.ClientID),
		ClientSecret: strings.TrimSpace(c.ClientSecret),
		RedirectURL:  c.RedirectURL(r),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     endpoint,
	}
}

func (c GoogleAuthConfig) UserInfoURL() string {
	if customUserInfoURL := strings.TrimSpace(c.UserInfoEndpoint); customUserInfoURL != "" {
		return customUserInfoURL
	}

	return googleUserInfoEndpoint
}

func (c GoogleAuthConfig) baseURL() string {
	return strings.TrimRight(strings.TrimSpace(c.PublicBaseURL), "/")
}

func isSupportedGoogleLoginEmail(email string) bool {
	normalizedEmail := normalizeEmail(email)
	return strings.HasSuffix(normalizedEmail, "@gmail.com") || strings.HasSuffix(normalizedEmail, "@googlemail.com")
}

func requestBaseURL(r *http.Request) string {
	return requestScheme(r) + "://" + r.Host
}

func requestScheme(r *http.Request) string {
	if forwardedProto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwardedProto != "" {
		return strings.ToLower(forwardedProto)
	}
	if r.TLS != nil {
		return "https"
	}

	return "http"
}
