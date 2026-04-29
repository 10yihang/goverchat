"""
Flask application entrypoint.
"""

import logging
import os
import time
import traceback
from datetime import timedelta

from flask import (
    Flask,
    abort,
    g,
    jsonify,
    render_template,
    request,
    send_from_directory,
)
from flask_cors import CORS

import config

SPA_DIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "static", "dist"
)
SERVE_SPA = os.environ.get("SERVE_SPA", "").lower() in ("1", "true", "yes")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
    app.config["DEBUG"] = config.DEBUG
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = not config.DEBUG
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(
        hours=config.SESSION_LIFETIME_HOURS
    )

    cors_origins = config.CORS_ALLOWED_ORIGINS or [config.PUBLIC_BASE_URL]
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
    )

    from models.db import close_db, init_pool

    init_pool()
    app.teardown_appcontext(close_db)

    from routes.admin import admin_bp
    from routes.applications import applications_bp
    from routes.auth import auth_bp
    from routes.c_auth import c_auth_bp
    from routes.chat import chat_bp
    from routes.guide import guide_bp
    from routes.history import history_bp
    from routes.image import image_bp
    from routes.service_center import service_center_bp
    from routes.demo import demo_bp
    from routes.voice import voice_bp
    from services.auth_service import admin_required

    app.register_blueprint(auth_bp)
    app.register_blueprint(c_auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(image_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(guide_bp)
    app.register_blueprint(service_center_bp)
    app.register_blueprint(applications_bp)
    app.register_blueprint(demo_bp)

    @app.before_request
    def before_request() -> None:
        g.request_start = time.perf_counter()

    @app.after_request
    def after_request(response):
        from services.metrics_service import metrics_service

        started = getattr(g, "request_start", None)
        duration_ms = 0.0
        if started is not None:
            duration_ms = (time.perf_counter() - started) * 1000
        metrics_service.record(
            path=request.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response

    if not SERVE_SPA:

        @app.get("/")
        def index():
            return render_template("index.html")

        @app.get("/index.html")
        def index_html():
            return render_template("index.html")

        @app.get("/login")
        def login():
            return render_template("login.html")

        @app.get("/login.html")
        def login_html():
            return render_template("login.html")

        @app.get("/chat")
        def chat():
            return render_template("chat.html")

        @app.get("/chat.html")
        def chat_html():
            return render_template("chat.html")

        @app.get("/guide")
        def guide():
            return render_template("guide.html")

        @app.get("/guide.html")
        def guide_html():
            return render_template("guide.html")

        @app.get("/service-center")
        def service_center():
            return render_template("service_center.html")

        @app.get("/service-center.html")
        def service_center_html():
            return render_template("service_center.html")

        @app.get("/admin")
        @admin_required
        def admin():
            return render_template("admin.html")

        @app.get("/admin.html")
        @admin_required
        def admin_html():
            return render_template("admin.html")

        @app.get("/docs")
        def docs():
            return render_template("docs.html")

    @app.get("/favicon.ico")
    def favicon():
        return "", 204

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "请求参数错误", "detail": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "未登录或登录已失效", "detail": str(error)}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "当前账号无权限访问", "detail": str(error)}), 403

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "接口不存在", "detail": str(error)}), 404
        if SERVE_SPA:
            return send_from_directory(SPA_DIST_DIR, "index.html")
        return jsonify({"error": "页面不存在", "detail": str(error)}), 404

    @app.errorhandler(413)
    def too_large(error):
        return jsonify({"error": "文件过大，最大支持 16MB", "detail": str(error)}), 413

    @app.errorhandler(500)
    def internal_error(error):
        logger.error("500 internal error:\n%s", traceback.format_exc())
        return jsonify(
            {"error": "服务端内部错误，请稍后重试", "detail": str(error)}
        ), 500

    if SERVE_SPA:
        if not os.path.isfile(os.path.join(SPA_DIST_DIR, "index.html")):
            logger.warning(
                "[Startup] SERVE_SPA=true but %s/index.html missing — run `cd frontend && npm run build` first",
                SPA_DIST_DIR,
            )

        @app.get("/dist/<path:filename>")
        def spa_asset(filename: str):
            return send_from_directory(SPA_DIST_DIR, filename)

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def spa_fallback(path: str):
            if path.startswith(("api/", "static/")):
                abort(404)
            full = os.path.join(SPA_DIST_DIR, path)
            if path and os.path.isfile(full):
                return send_from_directory(SPA_DIST_DIR, path)
            return send_from_directory(SPA_DIST_DIR, "index.html")

        logger.info("[Startup] SPA mode ON — serving %s", SPA_DIST_DIR)

    with app.app_context():
        _startup()

    return app


def _startup() -> None:
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(config.VOICE_UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(config.IMAGE_UPLOAD_FOLDER, exist_ok=True)

    from services.asr_service import asr_service
    from services.tfidf_service import tfidf_service

    try:
        tfidf_service.load()
        logger.info("[Startup] TF-IDF matrix loaded")
    except Exception as exc:
        logger.warning("[Startup] TF-IDF load skipped: %s", exc)

    asr_service.preload()
    logger.info("[Startup] Whisper preload thread started")


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=config.DEBUG,
        threaded=True,
        use_reloader=False,
    )
