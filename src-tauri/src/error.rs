use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Io(#[from] std::io::Error),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("already exists: {0}")]
    AlreadyExists(String),

    #[allow(dead_code)]
    #[error("permission denied: {0}")]
    PermissionDenied(String),

    #[error("trash error: {0}")]
    Trash(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

impl From<trash::Error> for AppError {
    fn from(e: trash::Error) -> Self {
        AppError::Trash(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
