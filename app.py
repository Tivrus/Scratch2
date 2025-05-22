from imports._import_ import *


# Flask application setup
server = Flask(__name__)


@server.route("/")
@server.route("/index")
def index():
    return render_template("index.html", title="Scratch2 | Визуальное программирование")


@server.route("/Scratch2/main")
def main():
    return render_template("index.html", title="Scratch2 | Визуальное программирование")


@server.route("/services")
def services():
    return render_template("services.html", title="Cart", Ava="<img src='' alt=''>")


@server.route('/libraries')
def libraries():
    return render_template('libraries.html', title='Библиотеки - Scratch2')


@server.route('/block-creator')
def block_creator():
    return render_template('block_creator.html', title='Создание блоков - Scratch2')


if __name__ == "__main__":
    # Start the Flask server
    print("Запуск Flask-сервера...")
    server.run(debug=True)