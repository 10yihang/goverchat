from __future__ import annotations

import logging
import smtplib
import ssl
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from html import escape

import config

logger = logging.getLogger(__name__)


class EmailService:
    def is_configured(self) -> bool:
        return bool(config.SMTP_HOST and config.SMTP_USER and config.SMTP_FROM_EMAIL)

    def send(
        self, to_email: str, subject: str, html_body: str, text_body: str | None = None
    ) -> bool:
        if not self.is_configured():
            logger.warning(
                "[Email] SMTP 未配置，跳过发送 to=%s subject=%s", to_email, subject
            )
            return False

        to_email = (to_email or "").strip()
        if not to_email:
            logger.warning("[Email] 收件人为空，已忽略")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((config.SMTP_FROM_NAME, config.SMTP_FROM_EMAIL))
        msg["To"] = to_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if config.SMTP_USE_SSL:
                ssl_ctx = ssl.create_default_context()
                with smtplib.SMTP_SSL(
                    config.SMTP_HOST,
                    config.SMTP_PORT,
                    timeout=config.SMTP_TIMEOUT,
                    context=ssl_ctx,
                ) as server:
                    server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                    server.sendmail(config.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(
                    config.SMTP_HOST,
                    config.SMTP_PORT,
                    timeout=config.SMTP_TIMEOUT,
                ) as server:
                    if config.SMTP_USE_STARTTLS:
                        server.starttls(context=ssl.create_default_context())
                    server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                    server.sendmail(config.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            logger.info("[Email] 已发送 to=%s subject=%s", to_email, subject)
            return True
        except Exception as exc:
            logger.error(
                "[Email] 发送失败 to=%s subject=%s err=%s", to_email, subject, exc
            )
            return False

    def send_async(
        self, to_email: str, subject: str, html_body: str, text_body: str | None = None
    ) -> None:
        thread = threading.Thread(
            target=self.send,
            args=(to_email, subject, html_body, text_body),
            name=f"email-send-{to_email[:20]}",
            daemon=True,
        )
        thread.start()

    def send_login_code_async(self, to_email: str, code: str, ttl_minutes: int) -> None:
        subject = "【政务智聊】您的登录验证码"
        html_body = _render_login_code(code, ttl_minutes)
        text_body = (
            f"您的登录验证码为：{code}\n"
            f"有效期 {ttl_minutes} 分钟，请勿向任何人泄露。\n"
            f"如非本人操作请忽略此邮件。"
        )
        self.send_async(to_email, subject, html_body, text_body)

    def send_application_submitted(
        self,
        to_email: str,
        applicant_name: str,
        service_title: str,
        query_no: str,
    ) -> None:
        subject = f"【政务智聊】您的「{service_title}」办理申请已提交"
        html_body = _render_application_submitted(
            applicant_name, service_title, query_no
        )
        text_body = (
            f"{applicant_name or '您好'}，\n\n"
            f"您的「{service_title}」办理申请已成功提交。\n"
            f"受理编号：{query_no}\n"
            f"您可在政务智聊中输入此编号查询办理进度，或在'我的申请'页面跟踪状态。\n\n"
            f"——政务智聊"
        )
        self.send_async(to_email, subject, html_body, text_body)

    def send_status_changed(
        self,
        to_email: str,
        applicant_name: str,
        service_title: str,
        query_no: str,
        old_status: str,
        new_status: str,
        admin_remark: str = "",
    ) -> None:
        subject = f"【政务智聊】「{service_title}」状态更新：{new_status}"
        html_body = _render_status_changed(
            applicant_name,
            service_title,
            query_no,
            old_status,
            new_status,
            admin_remark,
        )
        text_body_lines = [
            f"{applicant_name or '您好'}，",
            "",
            f"您的「{service_title}」（受理编号 {query_no}）状态已更新：",
            f"  {old_status} → {new_status}",
        ]
        if admin_remark:
            text_body_lines.append(f"管理员备注：{admin_remark}")
        text_body_lines.extend(["", "——政务智聊"])
        self.send_async(to_email, subject, html_body, "\n".join(text_body_lines))

    def send_welcome(self, to_email: str) -> None:
        subject = "【政务智聊】欢迎使用"
        html_body = _render_welcome(to_email)
        text_body = (
            f"欢迎注册政务智聊！\n\n"
            f"您可以在聊天中咨询交管业务办理事宜，也可以直接填写表单提交办理申请。\n"
            f"我们将通过本邮箱（{to_email}）通知您申请进度更新。\n\n"
            f"——政务智聊"
        )
        self.send_async(to_email, subject, html_body, text_body)

    def send_status_changed(
        self,
        to_email: str,
        applicant_name: str,
        service_title: str,
        query_no: str,
        old_status: str,
        new_status: str,
        admin_remark: str = "",
    ) -> None:
        subject = f"【政务智聊】「{service_title}」状态更新：{new_status}"
        html_body = _render_status_changed(
            applicant_name,
            service_title,
            query_no,
            old_status,
            new_status,
            admin_remark,
        )
        text_body_lines = [
            f"{applicant_name or '您好'}，",
            "",
            f"您的「{service_title}」（受理编号 {query_no}）状态已更新：",
            f"  {old_status} → {new_status}",
        ]
        if admin_remark:
            text_body_lines.append(f"管理员备注：{admin_remark}")
        text_body_lines.extend(["", "——政务智聊"])
        self.send_async(to_email, subject, html_body, "\n".join(text_body_lines))

    def send_welcome(self, to_email: str) -> None:
        subject = "【政务智聊】欢迎使用"
        html_body = _render_welcome(to_email)
        text_body = (
            f"欢迎注册政务智聊！\n\n"
            f"您可以在聊天中咨询交管业务办理事宜，也可以直接填写表单提交办理申请。\n"
            f"我们将通过本邮箱（{to_email}）通知您申请进度更新。\n\n"
            f"——政务智聊"
        )
        self.send_async(to_email, subject, html_body, text_body)


def _wrapper(content: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#1a1a1a;">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e6e6e0;border-radius:6px;overflow:hidden;">
  <div style="padding:20px 28px;background:#0d2c54;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:1px;">
    政务智聊
  </div>
  <div style="padding:28px;font-size:14px;line-height:1.8;">{content}</div>
  <div style="padding:14px 28px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#888;">
    本邮件由系统自动发送，请勿直接回复。
  </div>
</div>
</body></html>"""


def _render_login_code(code: str, ttl_minutes: int) -> str:
    safe_code = escape(str(code))
    body = f"""
<p>您好，</p>
<p>您正在登录政务智聊，验证码为：</p>
<p style="font-size:30px;letter-spacing:8px;color:#0d2c54;font-weight:bold;text-align:center;
  padding:18px;background:#f0f4fa;border-radius:6px;margin:20px 0;">{safe_code}</p>
<p>该验证码 <b>{int(ttl_minutes)} 分钟内</b> 有效，请勿向任何人泄露。</p>
<p style="color:#888;">如非本人操作，请忽略此邮件。</p>
"""
    return _wrapper(body)


def _render_application_submitted(
    applicant_name: str, service_title: str, query_no: str
) -> str:
    portal_url = f"{config.PUBLIC_BASE_URL}/service-center"
    safe_name = escape(applicant_name or "您好")
    safe_title = escape(service_title)
    safe_no = escape(query_no)
    safe_url = escape(portal_url, quote=True)
    body = f"""
<p>{safe_name}，</p>
<p>您的 <b>「{safe_title}」</b> 办理申请已成功提交。</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;">
  <tr><td style="padding:10px;background:#fafafa;width:120px;color:#666;">受理编号</td>
      <td style="padding:10px;background:#fafafa;font-family:Consolas,monospace;font-weight:bold;color:#0d2c54;">{safe_no}</td></tr>
  <tr><td style="padding:10px;background:#fff;color:#666;">事项名称</td>
      <td style="padding:10px;background:#fff;">{safe_title}</td></tr>
  <tr><td style="padding:10px;background:#fafafa;color:#666;">当前状态</td>
      <td style="padding:10px;background:#fafafa;color:#0d8053;">已提交，等待受理</td></tr>
</table>
<p>您可以：</p>
<ul>
  <li>在政务智聊聊天中输入受理编号查询进度</li>
  <li>访问 <a href="{safe_url}" style="color:#0d2c54;">服务中心</a> 跟踪所有申请</li>
</ul>
"""
    return _wrapper(body)


def _render_status_changed(
    applicant_name: str,
    service_title: str,
    query_no: str,
    old_status: str,
    new_status: str,
    admin_remark: str,
) -> str:
    portal_url = f"{config.PUBLIC_BASE_URL}/service-center"
    safe_name = escape(applicant_name or "您好")
    safe_title = escape(service_title)
    safe_no = escape(query_no)
    safe_old = escape(old_status)
    safe_new = escape(new_status)
    safe_url = escape(portal_url, quote=True)
    remark_block = (
        f'<p style="background:#fff8e1;padding:12px;border-left:3px solid #f4b400;">'
        f"<b>办理人员备注：</b><br/>{escape(admin_remark)}</p>"
        if admin_remark
        else ""
    )
    body = f"""
<p>{safe_name}，</p>
<p>您的 <b>「{safe_title}」</b> 办理申请状态已更新：</p>
<p style="text-align:center;font-size:18px;margin:24px 0;">
  <span style="color:#888;">{safe_old}</span>
  <span style="margin:0 12px;color:#0d2c54;">→</span>
  <span style="color:#0d8053;font-weight:bold;">{safe_new}</span>
</p>
<p style="color:#666;">受理编号：<span style="font-family:Consolas,monospace;color:#0d2c54;">{safe_no}</span></p>
{remark_block}
<p><a href="{safe_url}" style="display:inline-block;padding:10px 20px;background:#0d2c54;color:#fff;text-decoration:none;border-radius:4px;">查看详情</a></p>
"""
    return _wrapper(body)


def _render_welcome(to_email: str) -> str:
    portal_url = f"{config.PUBLIC_BASE_URL}/chat"
    safe_email = escape(to_email)
    safe_url = escape(portal_url, quote=True)
    body = f"""
<p>欢迎注册政务智聊！</p>
<p>您可以使用本邮箱 <b>{safe_email}</b> 通过验证码登录平台。</p>
<p>平台主要功能：</p>
<ul>
  <li>智能问答 —— 三模态输入（文字 / 语音 / 图片）</li>
  <li>办事指南 —— 7 大交管事项材料/流程速查</li>
  <li>在线办理 —— 聊天里直接填表提交，不用跳页</li>
</ul>
<p><a href="{safe_url}" style="display:inline-block;padding:10px 20px;background:#0d2c54;color:#fff;text-decoration:none;border-radius:4px;">立即体验</a></p>
"""
    return _wrapper(body)


email_service = EmailService()
