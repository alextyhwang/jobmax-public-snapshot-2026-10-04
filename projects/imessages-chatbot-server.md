# iMessages Chatbot Server

## Resume Bullet Bank
| Target Angle | Bullet |
|---|---|
| Platform/API | Built an asyncio Python API gateway for macOS Messages, supporting up to 20 concurrent stateful AI conversations over iMessage. |
| Agent infrastructure | Engineered iMessage AI infrastructure with SQLite conversation memory, 0.3s debounce batching, and semaphore-controlled Gemini API calls. |
| Data modeling/SQL | Designed SQLite data models for message history and processing state, with a sender/timestamp index and parameterized SQL for conversation retrieval. |
| Data ingestion/quality | Built incremental message ingestion using SQL joins, row-ID checkpoints, and null/empty-text filtering to process incoming messages and persist conversation history. |
| Automation | Automated macOS Messages with AppleScript to simulate typing indicators, mark messages as read, and send chunked AI responses with realistic latency. |
| OpenClaw integration | Built an OpenClaw agent-runtime presence sidecar that controls Messages.app read/typing behavior during agent turns without private IMCore access. |
| Performance | Designed a headless iMessage gateway targeting under 2s internal latency and 10-15 sustained messages per minute on a standard Mac Mini. |

