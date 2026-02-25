from flask import Blueprint, request, session, redirect, url_for, render_template
from routes.config import USER_CREDENTIALS

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if USER_CREDENTIALS.get(username) == password:
            session["logged_in"] = True
            session.permanent = True
            return redirect(url_for("main.index"))
        else:
            error = "Invalid Operator ID or Access Code."

    return render_template("login.html", error=error)


@auth_bp.route("/logout")
def logout():
    session.pop("logged_in", None)
    return redirect(url_for("auth.login"))
