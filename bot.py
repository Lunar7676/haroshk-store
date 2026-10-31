# ═══════════════════════════════════════════════════════════════
# HAROSHK STORE BOT — тестовый бот для Mini App
# ───────────────────────────────────────────────────────────────
# Запуск:
#   1) python -m pip install requests
#   2) впиши TOKEN ниже (получишь у @BotFather)
#   3) python bot.py https://твой-https-адрес   ← URL сайта
#
# Бот сам поставит кнопку меню (Mini App) по команде /url <адрес>,
# /start → выдает кнопку «Открыть магазин»
# ═══════════════════════════════════════════════════════════════

import sys
import time
import json
import os
from pathlib import Path
try:
    import requests
except ImportError:
    print("Нет библиотеки requests. Установи:  python -m pip install requests")
    sys.exit(1)

def read_token():
    """Токен берётся из переменной окружения BOT_TOKEN или из файла token.local.txt"""
    tok = os.environ.get("BOT_TOKEN")
    if tok:
        return tok.strip()
    f = Path(__file__).with_name("token.local.txt")
    if f.exists():
        return f.read_text(encoding="utf-8").strip()
    return TOKEN

current_url = None  # текущий https-адрес сайта


def api(method, **params):
    r = requests.post(API + "/" + method, json=params, timeout=30)
    out = r.json()
    if not out.get("ok"):
        print("!", method, "->", out.get("description"))
    return out.get("result")


def set_webapp_url(url):
    """Ставит кнопку меню бота = Mini App по адресу url"""
    global current_url
    api("setChatMenuButton",
        menu_button={"type": "web_app", "text": "Открыть магазин", "web_app": {"url": url}})
    current_url = url
    print("[OK] Кнопка меню установлена:", url)
    me = api("getMe")
    print("[OK] Бот:", "@" + (me or {}).get("username", "?"))


def on_message(m):
    chat = m["chat"]
    cid = chat["id"]
    text = (m.get("text") or "").strip()

    if text.startswith("/start") or text.startswith("/shop"):
        if m.get("web_app_data") is None:
            api("sendMessage", chat_id=cid, parse_mode="Markdown",
                text="*Haroshk Store* 🛒\n3D-моделі, фігурки та декор.\n\nНатисни кнопку нижче, щоб відкрити магазин 👇",
                reply_markup={
                    "inline_keyboard": [[
                        {"text": "🛒 Відкрити магазин", "web_app": {"url": current_url}}
                    ]] if current_url else [[
                        {"text": "❗ Сначала задай адрес: /url https://..."}
                    ]]
                })
        return

    if text.startswith("/url"):
        parts = text.split()
        if len(parts) < 2:
            api("sendMessage", chat_id=cid,
                text="Так задавать адрес:\n`/url https://адрес-сайта`",
                parse_mode="Markdown")
            return
        url = parts[1]
        if not url.startswith("https://"):
            api("sendMessage", chat_id=cid, text="Адрес должен начинаться с https://\n(для Telegram Mini App нужен HTTPS)")
            return
        set_webapp_url(url)
        api("sendMessage", chat_id=cid,
            text="✅ Кнопка меню обновлена!\nЗакрой и заново открой чат с ботом — появится «Скачать»/меню-кнопка снизу.",
            parse_mode="Markdown")
        return

    if text.startswith("/help"):
        api("sendMessage", chat_id=cid,
            text="Команды:\n/start — открыть магазин\n/url https://адрес — задать адрес приложения\n/help — этот список")
        return

    api("sendMessage", chat_id=cid, text="Напиши /start, щоб відкрити магазин 🛒")


def main():
    global API
    tok = read_token()
    API = "https://api.telegram.org/bot" + tok
    if "ВСТАВЬ" in tok or not tok:
        print("Нет токена! Создай файл token.local.txt и вставь туда токен от @BotFather.")
        return

    url = None
    for arg in sys.argv[1:]:
        if arg.startswith("https://"):
            url = arg
    if url:
        set_webapp_url(url)
    else:
        print("Адрес не передан. Задай в чате: /url https://адрес")

    me = api("getMe")
    if me is None:
        print("Токен неверный или нет связи с Telegram.")
        return
    print("[OK] Бот запущен: @" + me["username"])
    print("Ждём сообщения... (Ctrl+C чтобы остановить)")

    offset = 0
    while True:
        try:
            updates = api("getUpdates", timeout=25, offset=offset)
            for u in updates or []:
                offset = u["update_id"] + 1
                m = u.get("message")
                if m and "text" in m:
                    on_message(m)
        except KeyboardInterrupt:
            print("Выход.")
            return
        except Exception as e:
            print("Ошибка соединения:", e)
            time.sleep(3)


if __name__ == "__main__":
    main()
