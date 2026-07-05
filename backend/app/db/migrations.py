from sqlalchemy import text


def get_existing_columns(engine, table_name: str):
    with engine.connect() as connection:
        result = connection.execute(text(f"PRAGMA table_info({table_name})"))
        return [row[1] for row in result.fetchall()]


def add_column_if_missing(engine, table_name: str, column_name: str, column_sql: str):
    existing_columns = get_existing_columns(engine, table_name)

    if column_name not in existing_columns:
        with engine.connect() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}"))
            connection.commit()


def run_lightweight_migrations(engine):
    add_column_if_missing(
        engine=engine,
        table_name="candidates",
        column_name="recruitment_status",
        column_sql="recruitment_status VARCHAR DEFAULT 'New'"
    )
