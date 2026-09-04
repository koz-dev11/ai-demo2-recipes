from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import main
from main import app


@pytest.fixture(autouse=True)
def clear_recipes() -> Iterator[None]:
    main.recipes.clear()
    yield
    main.recipes.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
