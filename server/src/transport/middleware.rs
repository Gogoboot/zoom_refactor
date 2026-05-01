//! Auth middleware.
//!
//! Проверяет JWT токен и кладёт Claims в Extensions запроса.
//! Handlers достают user_id из Extensions — не знают про токены.

use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::infrastructure::auth::verify_token;

/// Состояние для middleware — только jwt_secret
#[derive(Clone)]
pub struct AuthState {
    pub jwt_secret: String,
}

/// Middleware: извлекает и проверяет Bearer токен.
/// Кладёт Claims в Extensions — доступны в любом handler через
/// `Extension(claims): Extension<Claims>`
pub async fn auth_middleware(
    State(state): State<AuthState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = extract_bearer_token(request.headers())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let claims = verify_token(&token, &state.jwt_secret)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    tracing::debug!(user_id = %claims.user_id, "✅ Токен проверен");

    request.extensions_mut().insert(claims);
    Ok(next.run(request).await)
}

/// Извлекает токен из заголовка `Authorization: Bearer <token>`
fn extract_bearer_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}
