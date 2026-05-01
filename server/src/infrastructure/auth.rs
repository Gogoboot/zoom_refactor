//! JWT идентификация.
//!
//! Выдаёт анонимные токены с user_id.
//! Авторизация (роли, права) добавляется позже поверх этого слоя.

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};

/// Данные внутри JWT токена.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Идентификатор пользователя — сквозной ID для логов и coturn
    pub user_id: String,
    /// Время истечения (Unix timestamp)
    pub exp: u64,
    /// Время выдачи (Unix timestamp)
    pub iat: u64,
}

/// Выдаёт новый анонимный JWT токен.
pub fn issue_guest_token(jwt_secret: &str, ttl_secs: u64) -> AppResult<(String, Claims)> {
    let now = current_timestamp();
    let claims = Claims {
        user_id: Uuid::new_v4().to_string(),
        iat: now,
        exp: now + ttl_secs,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Config(format!("JWT encode error: {}", e)))?;

    Ok((token, claims))
}

/// Проверяет JWT токен и возвращает Claims.
pub fn verify_token(token: &str, jwt_secret: &str) -> AppResult<Claims> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Auth(format!("Invalid token: {}", e)))?;

    Ok(token_data.claims)
}

fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
