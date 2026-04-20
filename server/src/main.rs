//! Signaling сервер для WebRTC.
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;

use signaling_server::{Config, ConnectionRegistry, MemoryRoomStore, Orchestrator};

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
    store:        MemoryRoomStore,
    admin_token:  String,
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
    let store    = MemoryRoomStore::new();
    let registry = ConnectionRegistry::new();

    // 3. Оркестратор
    let orchestrator = Orchestrator::new(store.clone(), registry);
    let orchestrator_for_shutdown = orchestrator.clone();

    // 4. Состояние приложения
    let state = AppState {
        orchestrator:  orchestrator.clone(),
        store:         store.clone(),
        admin_token:   config.admin_token.clone(),
    };

    // 5. Сборка приложения
    let app = Router::new()
        .route("/ws",           get(websocket_handler))
        .route("/health",       get(|| async { "ok" }))
        .route("/admin/rooms",  get(admin_rooms_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(
        format!("0.0.0.0:{}", config.port)
    ).await?;
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
            orchestrator_for_shutdown.shutdown_connections(1001, "Server Restarting").await;
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
) -> Response {
    ws.on_upgrade(|socket| async move {
        state.orchestrator.handle_connection(socket).await;
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
    let rooms = state.store.list().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let room_infos: Vec<RoomInfo> = rooms
        .iter()
        .map(|r| RoomInfo {
            id:                r.id.clone(),
            participant_count: r.participant_count(),
        })
        .collect();

    let total = room_infos.len();

    Ok(Json(RoomsResponse {
        rooms: room_infos,
        total,
    }))
}
