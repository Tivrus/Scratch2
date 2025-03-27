from flask import Flask, render_template, request, jsonify
import json
import os


# Настройка Flask-приложения
server = Flask(__name__)


@server.route("/main")
def main():
    return render_template("index.html", title="Пирсинг Салон | Through the heart", Ava="../static/images/logo.png")


@server.route("/services")
def services():
    return render_template("services.html", title="Cart", Ava="<img src='' alt=''>")


if __name__ == "__main__":

    # Запускаем Flask-сервер
    print("Запуск Flask-сервера...")
    server.run(debug=True)