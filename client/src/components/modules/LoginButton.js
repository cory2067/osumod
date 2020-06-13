import React, { Component } from "react";
import { get } from "../../utilities";
import "./LoginButton.css";

class LoginButton extends Component {
  constructor(props) {
    super(props);
  }

  submit = async () => {
    if (this.props.user.username) {
      await fetch("/auth/logout");
      this.props.updateUser({});
      return;
    }

    const width = 600;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    const popup = window.open(
      "/auth/login/",
      "",
      `toolbar=no, location=no, directories=no, status=no, menubar=no, 
      scrollbars=no, resizable=no, copyhistory=no, width=${width}, 
      height=${height}, top=${top}, left=${left}`
    );

    const loop = setInterval(async () => {
      if (popup.closed) {
        clearInterval(loop);
        const user = await get("/api/whoami");
        this.props.updateUser(user);
      }
    }, 50);
    return loop;
  };

  render() {
    return (
      <div className={`LoginButton-button`} onClick={this.submit}>
        <span>{this.props.user.username ? "Logout" : "Login"}</span>
      </div>
    );
  }
}

export default LoginButton;
