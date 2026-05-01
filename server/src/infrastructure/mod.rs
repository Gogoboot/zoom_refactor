//! Инфраструктурный слой: абстракции и реализации.
pub mod error;
pub mod room_repository;
pub mod memory_room_store;
pub mod connection_registry;
pub mod auth;

pub use error::InfraError;
pub use room_repository::RoomRepository;
pub use memory_room_store::MemoryRoomStore;
pub use connection_registry::ConnectionRegistry;
pub use auth::{issue_guest_token, verify_token, Claims};