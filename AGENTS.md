# Architecture rules

- Manual punch creation uses the shared insert-only conflict handler; existing punches are changed only by the explicit adjustment action, preserving original records when completing missing punches.