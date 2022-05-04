import React, { Component } from "react";
import { Link, Router } from "@reach/router";

import { Layout, Menu } from "antd";
import LoginButton from "./LoginButton";
import { post } from "../../utilities";

const { Header } = Layout;
const { SubMenu } = Menu;

const standardizeName = (name) => name.replace(/_/g, " ").toLowerCase();

// Navbar + login stuff
class Navbar extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const urlSegment = window.location.pathname.split("/")[1];
    const showSettings = () => {
      if (window.location.pathname == "/settings") return true;
      const username = this.props.user.username;
      const userId = this.props.user.userid;
      const owner = decodeURIComponent(urlSegment);
      if (!username) return false;
      return standardizeName(owner) === standardizeName(username) || owner == userId;
    };

    const userPath = urlSegment === "settings" ? this.props.user.username : urlSegment;

    return (
      <>
        <Header>
          {!this.props.home ? (
            <Menu theme="dark" mode="horizontal" selectable={false}>
              <Menu.Item key="0">
                <Link to={`/`}>Home</Link>
              </Menu.Item>
              <Menu.Item key="1">
                <Link to={`/${userPath}/`}>Queue</Link>
              </Menu.Item>
              <Menu.Item key="2">
                <Link to={`/${userPath}/request`}>Request</Link>
              </Menu.Item>
              <Menu.Item key="3">
                <Link to={`/${userPath}/archives`}>Archives</Link>
              </Menu.Item>
              {showSettings() && (
                <Menu.Item key="settings">
                  <Link to={`/settings`}>Settings</Link>
                </Menu.Item>
              )}
              <Menu.Item key="4">
                <LoginButton {...this.props} />
              </Menu.Item>
            </Menu>
          ) : (
            <Menu theme="dark" mode="horizontal" selectable={false}>
              <Menu.Item key="1">
                <Link to={`/`}>Home</Link>
              </Menu.Item>
              <Menu.Item key="2">
                <Link to={`/requests`}>My Requests</Link>
              </Menu.Item>
              <Menu.Item key="4">
                <LoginButton {...this.props} />
              </Menu.Item>
            </Menu>
          )}
        </Header>
      </>
    );
  }
}

export default Navbar;
