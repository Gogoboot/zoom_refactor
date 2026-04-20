//! Трейт для хранилища комнат (Dependency Inversion).
use async_trait::async_trait;
use crate::domain::Room;
use crate::infrastructure::InfraError;

#[async_trait]
pub trait RoomRepository: Send + Sync {
    async fn insert(&self, room: Room) -> Result<(), InfraError>;
    async fn get(&self, room_id: &str) -> Result<Option<Room>, InfraError>;
    async fn get_mut(&self, room_id: &str) -> Result<Option<Room>, InfraError>;
    async fn remove(&self, room_id: &str) -> Result<Option<Room>, InfraError>;
    async fn contains(&self, room_id: &str) -> Result<bool, InfraError>;
    async fn remove_if_empty(&self, room_id: &str) -> Result<(), InfraError>;

    /// Возвращает список всех активных комнат.
    /// Используется /admin/rooms endpoint.
    async fn list(&self) -> Result<Vec<Room>, InfraError>;
}
