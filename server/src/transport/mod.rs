//! Транспортный слой: WebSocket утилиты.

pub mod error;
pub mod websocket;
pub mod middleware;

pub use error::TransportError;
pub use websocket::split_socket;
pub use middleware::{auth_middleware, AuthState};
