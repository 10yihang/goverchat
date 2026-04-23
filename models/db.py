from __future__ import annotations

"""
数据库连接池模块
基于 DBUtils.PooledDB + PyMySQL 实现线程安全连接池
"""
import pymysql
from dbutils.pooled_db import PooledDB
from flask import g
import config

_pool: PooledDB | None = None


def init_pool() -> None:
    """应用启动时初始化连接池（由 app.py 调用一次）"""
    global _pool
    _pool = PooledDB(
        creator=pymysql,
        mincached=config.DB_POOL_MIN_CACHED,
        maxcached=config.DB_POOL_MAX_CACHED,
        maxconnections=config.DB_POOL_MAX_CONNECTIONS,
        blocking=True,
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset=config.DB_CHARSET,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def get_db():
    """
    从连接池获取连接，绑定到 Flask 请求上下文 g。
    同一请求内多次调用返回同一连接。
    """
    if "db" not in g:
        if _pool is None:
            raise RuntimeError("数据库连接池尚未初始化，请先调用 init_pool()")
        g.db = _pool.connection()
    return g.db


def get_pool_connection():
    """
    后台线程 / 启动钩子中获取连接（绕过 Flask 请求上下文 g）。
    调用方必须自己 close()。
    """
    if _pool is None:
        raise RuntimeError("数据库连接池尚未初始化，请先调用 init_pool()")
    return _pool.connection()


def close_db(e=None):
    """
    请求结束时归还连接到连接池（由 teardown_appcontext 自动调用）。
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()


def execute(
    sql: str,
    args=None,
    fetchone: bool = False,
    fetchall: bool = False,
    commit: bool = False,
):
    """
    便捷执行工具函数，封装 cursor 生命周期。

    Args:
        sql:      SQL 语句
        args:     参数（tuple 或 dict）
        fetchone: 返回单行
        fetchall: 返回全部行
        commit:   是否提交事务（INSERT/UPDATE/DELETE 时传 True）

    Returns:
        fetchone -> dict | None
        fetchall -> list[dict]
        commit   -> lastrowid (int)
        否则      -> None
    """
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            if fetchone:
                return cur.fetchone()
            if fetchall:
                return cur.fetchall()
            if commit:
                conn.commit()
                return cur.lastrowid
    except Exception:
        conn.rollback()
        raise
