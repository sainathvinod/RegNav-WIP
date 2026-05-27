"""Shared in-memory async session used by route smoke tests."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any


class _FakeResult:
    def __init__(self, items: list[Any]) -> None:
        self._items = items

    def scalars(self) -> _FakeResult:
        return self

    def all(self) -> list[Any]:
        return list(self._items)

    def first(self) -> Any | None:
        return self._items[0] if self._items else None

    def scalar_one_or_none(self) -> Any | None:
        return self._items[0] if self._items else None

    def scalar(self) -> Any | None:
        return self._items[0] if self._items else None

    def __iter__(self):  # type: ignore[no-untyped-def]
        return iter(self._items)


class FakeSession:
    """Minimal AsyncSession stand-in for unit tests.

    Routes typically call: ``add()``, ``commit()``, ``refresh()``,
    ``execute(select(Entity)...)``, and ``get()``. We service all of
    those by storing rows in a per-type dict.
    """

    def __init__(self) -> None:
        self.store: dict[type, dict[uuid.UUID, Any]] = {}
        self.added: list[Any] = []
        self.committed = False

    # ---- queries -------------------------------------------------------
    async def execute(
        self,
        stmt: Any,
        params: dict[str, Any] | None = None,
    ) -> _FakeResult:
        entity = self._guess_entity(stmt)
        if entity is None:
            return _FakeResult([])
        items = list(self.store.get(entity, {}).values())
        # Soft-delete filter when the statement explicitly checks ``deleted_at``
        text = str(stmt).lower()
        if "deleted_at" in text and "is null" in text:
            items = [i for i in items if getattr(i, "deleted_at", None) is None]
        return _FakeResult(items)

    def _guess_entity(self, stmt: Any) -> type | None:
        """Match by exact table name appearing as a whole word in the SQL.

        Without word boundaries, ``rules`` would match inside
        ``validation_runs``, causing the wrong entity to be returned.
        """
        import re

        text = str(stmt).lower()
        best: type | None = None
        best_len = 0
        for entity in self.store:
            tn = entity.__tablename__.lower()  # type: ignore[attr-defined]
            if re.search(rf"\b{re.escape(tn)}\b", text) and len(tn) > best_len:
                best = entity
                best_len = len(tn)
        return best

    # ---- CRUD ----------------------------------------------------------
    def add(self, instance: Any) -> None:
        now = datetime.now(UTC)
        if hasattr(instance, "created_at") and getattr(instance, "created_at", None) is None:
            instance.created_at = now
        if hasattr(instance, "updated_at") and getattr(instance, "updated_at", None) is None:
            instance.updated_at = now
        if hasattr(instance, "discovered_at") and getattr(instance, "discovered_at", None) is None:
            instance.discovered_at = now
        self.added.append(instance)
        bucket = self.store.setdefault(type(instance), {})
        bucket[instance.id] = instance

    def add_all(self, instances: list[Any]) -> None:
        for inst in instances:
            self.add(inst)

    async def get(self, entity: type, identifier: uuid.UUID) -> Any:
        return self.store.get(entity, {}).get(identifier)

    async def scalar(self, stmt: Any) -> Any:
        """Equivalent of ``(await execute(stmt)).scalar()``.

        For ``select(func.count())`` statements we just return the count of
        the relevant table; otherwise return the first row's first value.
        """
        text = str(stmt).lower()
        entity = self._guess_entity(stmt)
        if entity is None:
            # Could be a count over an unmapped entity — return 0 for counts
            if "count(" in text:
                return 0
            return None
        items = list(self.store.get(entity, {}).values())
        if "deleted_at" in text and "is null" in text:
            items = [i for i in items if getattr(i, "deleted_at", None) is None]
        if "count(" in text:
            return len(items)
        return items[0] if items else None

    async def delete(self, instance: Any) -> None:
        bucket = self.store.get(type(instance))
        if bucket is not None:
            bucket.pop(getattr(instance, "id", None), None)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        return None

    async def refresh(self, _instance: Any) -> None:
        return None

    async def close(self) -> None:
        return None
