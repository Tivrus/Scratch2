from imports._import_ import *


# Flask application setup
server = Flask(__name__)


@server.route("/")
@server.route("/index")
def index():
    return render_template("index.html", title="Scratch2 | Визуальное программирование")


@server.route("/main")
def main():
    return render_template("index.html", title="Scratch2 | Визуальное программирование")


@server.route("/services")
def services():
    return render_template("services.html", title="Cart", Ava="<img src='' alt=''>")


if __name__ == "__main__":
    # Start the Flask server
    print("Запуск Flask-сервера...")
    server.run(debug=True)