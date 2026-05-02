//! Signaling сервер для WebRTC.
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use signaling_server::RoomRepository;

use signaling_server::{Config, ConnectionRegistry, MemoryRoomStore, Orchestrator};

use axum::http::Method;
use tower_http::cors::{Any, CorsLayer};

use axum::middleware;
use axum::Extension;
use signaling_server::{issue_guest_token, Claims, auth_middleware, AuthState};


/// Новый DTO для /auth/guest:
#[derive(Serialize)]
struct GuestTokenResponse {
    token: String,
    user_id: String,
    expires_in: u64,
}


/// DTO для ответа /admin/rooms
#[derive(Serialize)]
struct RoomInfo {
    id: String,
    participant_count: usize,
}

/// DTO для ответа /admin/rooms
#[derive(Serialize)]
struct RoomsResponse {
    rooms: Vec<RoomInfo>,
    total: usize,
}

/// Состояние приложения — шарится между всеми хендлерами
#[derive(Clone)]
struct AppState {
    orchestrator: Orchestrator<MemoryRoomStore>,
    store: MemoryRoomStore,
    admin_token: String,
    turn_secret: String,
    domain: String,
    jwt_secret: String,
}

#[tokio::main]
async fn main() -> Result<(), signaling_server::AppError> {
    // 1. Конфигурация
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;
    tracing_subscriber::fmt()
        .with_env_filter(format!("signaling_server={}", config.log_level.as_str()))
        .init();

    // 2. Инфраструктура
    let store = MemoryRoomStore::new();
    let registry = ConnectionRegistry::new();

    // 3. Оркестратор
    let orchestrator = Orchestrator::new(store.clone(), registry);
    let orchestrator_for_shutdown = orchestrator.clone();

    // 4. Состояние приложения
    let state = AppState {
        orchestrator: orchestrator.clone(),
        store: store.clone(),
        admin_token: config.admin_token.clone(),
        turn_secret: config.turn_secret.clone(),
        domain: config.domain.clone(),
        jwt_secret: config.jwt_secret.clone(), 
    };

    // 5. Сборка приложения
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET])
        .allow_headers(Any);

// СТАЛО:
let auth_state = AuthState {
    jwt_secret: config.jwt_secret.clone(),
};

// Защищённые роуты — требуют JWT токен
let protected = Router::new()
    .route("/ws", get(websocket_handler))
    .route("/api/ice-servers", get(ice_servers_handler))
    .route_layer(middleware::from_fn_with_state(
        auth_state,
        auth_middleware,
    ));

// Публичные роуты — без токена
let public = Router::new()
    .route("/auth/guest", get(guest_token_handler))
    .route("/health", get(|| async { "ok" }))
    .route("/health/live", get(health_live_handler))
    .route("/health/ready", get(health_ready_handler))
    .route("/admin/rooms", get(admin_rooms_handler));

let app = Router::new()
    .merge(protected)
    .merge(public)
    .layer(cors)
    .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port)).await?;
    tracing::info!("🚀 Server listening on {}", listener.local_addr()?);

    // 6. Graceful Shutdown
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::broadcast::channel(1);

    tokio::spawn(async move {
        if let Err(e) = tokio::signal::ctrl_c().await {
            tracing::error!("Failed to install CTRL+C handler: {}", e);
        }
        let _ = shutdown_tx.send(());
    });

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = shutdown_rx.recv().await;
            tracing::info!("Получен сигнал остановки (Ctrl+C).");
            orchestrator_for_shutdown
                .shutdown_connections(1001, "Server Restarting")
                .await;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            tracing::info!("✅ Graceful shutdown completed.");
        })
        .await?;

    tracing::info!("🏁 Сервер полностью остановлен.");
    Ok(())
}

/// WebSocket handler
async fn websocket_handler(
    ws: axum::extract::WebSocketUpgrade,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,  // ← берём из middleware
) -> Response {
    ws.on_upgrade(|socket| async move {
        state.orchestrator.handle_connection(socket, claims.user_id).await;
    })
}

/// Admin handler — возвращает список активных комнат
async fn admin_rooms_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<RoomsResponse>, StatusCode> {
    // Проверяем токен из заголовка Authorization: Bearer <token>
    let auth = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match auth {
        Some(token) if token == state.admin_token => {}
        _ => return Err(StatusCode::UNAUTHORIZED),
    }

    // Получаем список комнат
    use signaling_server::RoomRepository;
    let rooms = state
        .store
        .list()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let room_infos: Vec<RoomInfo> = rooms
        .iter()
        .map(|r| RoomInfo {
            id: r.id.clone(),
            participant_count: r.participant_count(),
        })
        .collect();

    let total = room_infos.len();

    Ok(Json(RoomsResponse {
        rooms: room_infos,
        total,
    }))
}

/// Liveness probe — сервер запущен и отвечает
async fn health_live_handler() -> &'static str {
    "ok"
}

/// Readiness probe — сервер готов принимать запросы
async fn health_ready_handler(State(state): State<AppState>) -> Result<&'static str, StatusCode> {
    // Проверяем что хранилище доступно
    match state.store.list().await {
        Ok(_) => Ok("ready"),
        Err(_) => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}

/// ICE servers handler — возвращает STUN/TURN credentials
async fn ice_servers_handler(
    
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,  // ← добавить
) -> Json<serde_json::Value> {
    tracing::info!(user_id = %claims.user_id, "🧊 ICE servers запрошены");
    use base64::{engine::general_purpose::STANDARD, Engine};
    use hmac::{Hmac, Mac};
    use sha1::Sha1;

    let ttl = 3600u64;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + ttl;

    let username = format!("{}:{}", timestamp, claims.user_id);

    let mut mac = Hmac::<Sha1>::new_from_slice(state.turn_secret.as_bytes()).unwrap();
    mac.update(username.as_bytes());
    let password = STANDARD.encode(mac.finalize().into_bytes());

    Json(serde_json::json!({
        "iceServers": [
            {
                "urls": format!("stun:{}:3478", state.domain)
            },
            {
                "urls": [
                    format!("turn:{}:3478?transport=udp", state.domain),
                    format!("turn:{}:3478?transport=tcp", state.domain),
                    format!("turns:{}:5349?transport=tcp", state.domain),
                ],
                "username": username,
                "credential": password
            }
        ]
    }))
}

/// Guest token handler — выдаёт анонимный JWT токен
async fn guest_token_handler(
    State(state): State<AppState>,
) -> Result<Json<GuestTokenResponse>, StatusCode> {
    let ttl = 3600u64;

    let (token, claims) = issue_guest_token(&state.jwt_secret, ttl)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tracing::info!(user_id = %claims.user_id, "🎫 Выдан гостевой токен");

    Ok(Json(GuestTokenResponse {
         token,
         user_id: claims.user_id,
         expires_in: ttl,
    }))
}